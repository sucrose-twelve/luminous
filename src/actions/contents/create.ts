"use server"

import { eq, sql } from "drizzle-orm"
import { updateTag } from "next/cache"
import { z } from "zod"

import { withRole } from "@/actions/auth"
import { STAFF_ROLES } from "@/constants"
import { db, schema } from "@/drizzle"
import { contentColumns, seasonColumns } from "@/drizzle/table-columns"
import { primarySource } from "@/libs/media"
import { slugify } from "@/libs/utils"

import {
  checkArtPath,
  checkSourceDir,
  checkSourcePath,
  createFolder,
  createSourceFolder
} from "./paths"
import { contentValidator, seasonValidator } from "./validator.zod"

/**
 * Creates a content from the control panel's content form. Staff only.
 *
 * The source directory is created when it isn't on disk yet, after the insert, so a taken slug leaves no empty
 * folder; if it can't be created, the new row is deleted again.
 *
 * Expected failures are returned, not thrown: field errors from Zod, the source directory check
 * (`checkSourceDir`), or `createFolder`, or a `message` when the slug is already taken.
 */
export const createContent = withRole(STAFF_ROLES, async (_account, input: unknown) => {
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

  const sourceDirError = await checkSourceDir(values.sourceDir)
  if (sourceDirError) {
    return { ok: false as const, errors: { sourceDir: [sourceDirError] } }
  }

  const [content] = await db
    .insert(schema.contents)
    .values({ ...values, slug })
    .onConflictDoNothing()
    .returning({ id: contentColumns.id, slug: contentColumns.slug })

  if (!content) {
    return { ok: false as const, message: `A content with slug "${slug}" already exists` }
  }

  const folderError = await createFolder(values.sourceDir)
  if (folderError) {
    await db.delete(schema.contents).where(eq(schema.contents.id, content.id))
    return { ok: false as const, errors: { sourceDir: [folderError] } }
  }

  updateTag("contents/list")
  return { ok: true as const, content }
})

/**
 * Creates a season from the control panel's season form after checking its sources (see `checkSourcePath`)
 * and that `poster` is an image path, which may sit in any folder and needn't be on disk yet. Staff only.
 *
 * Source folders that aren't on disk yet are created after the insert (`createSourceFolder`), like
 * `createContent`'s source directory.
 *
 * Expected failures are returned, not thrown, like `createContent`: also a `message` when another season was
 * already imported from the same primary source, or has the same season number.
 */
export const createSeason = withRole(STAFF_ROLES, async (_account, input: unknown) => {
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

  const posterError = checkArtPath(poster)
  const [[content], [duplicate], sourceErrors] = await Promise.all([
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
    Promise.all(sources.map((source) => checkSourcePath(source, kind)))
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

  const folderErrors = (
    await Promise.all(sources.map((source) => createSourceFolder(source, kind)))
  ).filter((error) => error !== null)
  if (folderErrors.length > 0) {
    await db.delete(schema.seasons).where(eq(schema.seasons.id, season.id))
    return { ok: false as const, errors: { sources: folderErrors } }
  }

  updateTag("seasons/list")
  return { ok: true as const, season }
})
