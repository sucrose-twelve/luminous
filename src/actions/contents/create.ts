"use server"

import path from "node:path"

import { eq, sql } from "drizzle-orm"
import { updateTag } from "next/cache"
import { z } from "zod"

import { db, schema } from "@/drizzle"
import { contentColumns, seasonColumns } from "@/drizzle/table-columns"
import {
  IMAGE_EXTENSIONS,
  isSafeMediaPath,
  pathType,
  primarySource,
  VIDEO_EXTENSIONS
} from "@/libs/media"
import { slugify } from "@/libs/utils"

import { contentValidator, seasonValidator } from "./validator.zod"

/**
 * Checks that an art path is an existing image given by its full path: the same rule the art route applies
 * before serving it. Posters may sit in any folder.
 *
 * @returns An error message, or `null` when the path is fine
 */
async function checkArtPath(filePath: string) {
  if (!isSafeMediaPath(filePath, null, IMAGE_EXTENSIONS)) {
    return `Must be a full path to a ${IMAGE_EXTENSIONS.join(" / ")} file`
  }

  return (await pathType(filePath)) === "file" ? null : "File not found"
}

/**
 * Checks one season source: a movie's is an `.mp4` file, any other kind's a folder of `01.mp4`, `02.mp4`, …
 * Any source but the primary one may be listed before its files exist (`tests/track.spec.ts` skips it).
 *
 * @param isPrimary - Whether this is the season's `primarySource`, which has to be on disk
 * @returns An error message prefixed with the source's language, or `null` when the source is fine
 */
async function checkSourcePath(
  { language, pathname }: Content.SeasonSource,
  kind: Content.SeasonKind,
  isPrimary: boolean
) {
  const isMovie = kind === "movie"
  if (
    isMovie
      ? !isSafeMediaPath(pathname, null, VIDEO_EXTENSIONS)
      : !path.isAbsolute(pathname)
  ) {
    return `${language}: Must be a full path to ${isMovie ? `a ${VIDEO_EXTENSIONS.join(" / ")} file` : "a folder"}`
  }

  const type = await pathType(pathname)
  if (type === (isMovie ? "file" : "directory") || (type === null && !isPrimary))
    return null

  return `${language}: ${type === null ? "Not found" : `Must be a ${isMovie ? "file" : "folder"}`}`
}

/**
 * Imports a content from the import form.
 *
 * Expected failures are returned, not thrown: field errors from Zod, or a `message` when the slug is already
 * taken.
 */
export async function createContent(input: unknown) {
  const parsed = contentValidator.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
  }

  const { slug: slugInput, ...values } = parsed.data
  const slug = slugify(slugInput ?? values.title)
  if (!slug) {
    return {
      ok: false as const,
      errors: { slug: ["The title has no Latin letters, so type a slug"] }
    }
  }

  const [content] = await db
    .insert(schema.contents)
    .values({ ...values, slug })
    .onConflictDoNothing()
    .returning({ id: contentColumns.id, slug: contentColumns.slug })

  if (!content) {
    return { ok: false as const, message: `A content with slug "${slug}" already exists` }
  }

  updateTag("contents/list")
  return { ok: true as const, content }
}

/**
 * Imports a season from the import form after checking its sources (see `checkSourcePath`) and that `poster`
 * is an existing image, which may sit in any folder.
 *
 * Expected failures are returned, not thrown, like `createContent`: also a `message` when another season was
 * already imported from the same primary source, or has the same season number.
 */
export async function createSeason(input: unknown) {
  const parsed = seasonValidator.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
  }

  const { contentId, kind, sources, poster } = parsed.data
  /**
   * The validator already requires at least one source; this only narrows the type.
   */
  const primary = primarySource(sources)
  if (!primary) {
    return { ok: false as const, errors: { sources: ["Add at least one source"] } }
  }

  const [[content], [duplicate], sourceErrors, posterError] = await Promise.all([
    db
      .select({ id: contentColumns.id })
      .from(schema.contents)
      .where(eq(schema.contents.id, contentId))
      .limit(1),
    db
      .select({ id: seasonColumns.id })
      .from(schema.seasons)
      .where(
        sql`${schema.seasons.sources} @> ${JSON.stringify([{ pathname: primary.pathname }])}::jsonb`
      )
      .limit(1),
    Promise.all(
      sources.map((source) => checkSourcePath(source, kind, source === primary))
    ),
    checkArtPath(poster)
  ])

  if (!content) {
    return { ok: false as const, errors: { contentId: ["Content not found"] } }
  }

  const sourceError = sourceErrors.filter((error) => error !== null)
  if (sourceError.length > 0 || posterError) {
    return {
      ok: false as const,
      errors: {
        ...(sourceError.length > 0 && { sources: sourceError }),
        ...(posterError && { poster: [posterError] })
      }
    }
  }

  if (duplicate) {
    return {
      ok: false as const,
      message: `A season was already imported from ${primary.pathname}`
    }
  }

  const [season] = await db
    .insert(schema.seasons)
    .values(parsed.data)
    .onConflictDoNothing()
    .returning({
      id: schema.seasons.id,
      kind: schema.seasons.kind,
      seasonNo: schema.seasons.seasonNo
    })

  if (!season) {
    return {
      ok: false as const,
      message: `Season ${parsed.data.seasonNo} already exists for this content`
    }
  }

  updateTag("seasons/list")
  return { ok: true as const, season }
}
