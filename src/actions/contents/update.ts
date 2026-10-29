"use server"

import { and, eq, ne, sql } from "drizzle-orm"
import { pick } from "es-toolkit"
import { updateTag } from "next/cache"
import { z } from "zod"

import { withRole } from "@/actions/auth"
import { STAFF_ROLES } from "@/constants"
import { db, schema } from "@/drizzle"
import { contentColumns, seasonColumns } from "@/drizzle/table-columns"
import { primarySource, seasonArtDirectory } from "@/libs/media"
import { slugify } from "@/libs/utils"

import { checkArtPath, checkSourceDir, checkSourcePath } from "./paths"
import { contentUpdateValidator, seasonValidator } from "./validator.zod"

/**
 * Picked outside the `withRole` callback: inline, TypeScript infers `pick`'s keys from the callback's generic
 * return type and types the row as the whole table.
 */
const currentFields = pick(contentColumns, ["id", "slug", "title", "sourceDir"])
const seasonPathFields = pick(seasonColumns, ["kind", "seasonNo", "sources"])
const currentSeasonFields = pick(seasonColumns, ["id", "contentId", "sources"])

/**
 * Saves the control panel's edit-content form. Staff only.
 *
 * The slug can't be edited: it follows the title (`slugify`), and a title without Latin letters keeps the old
 * slug instead of failing. Moving the source directory moves no files; seasons whose primary source isn't
 * inside the new folder still play, but `tests/track.spec.ts` can't import them again (`seasonArtDirectory`),
 * so the result carries a `warning` naming how many.
 *
 * @param contentId - `contents.id`
 * @param input - The form values, validated with `contentUpdateValidator`
 * @returns `{ ok: true, content, warning }`, or field `errors` / a `message` for expected failures
 */
export const updateContent = withRole(
  STAFF_ROLES,
  async (_account, contentId: unknown, input: unknown) => {
    const id = z.uuid().safeParse(contentId)
    const parsed = contentUpdateValidator.safeParse(input)
    if (!id.success) {
      return { ok: false as const, message: "Content not found" }
    }
    if (!parsed.success) {
      return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
    }

    const values = parsed.data
    const [current] = await db
      .select(currentFields)
      .from(schema.contents)
      .where(eq(schema.contents.id, id.data))
      .limit(1)
    if (!current) {
      return { ok: false as const, message: "Content not found" }
    }

    const slug =
      values.title === current.title
        ? current.slug
        : slugify(values.title) || current.slug
    const isMoved = values.sourceDir !== current.sourceDir

    const [[taken], sourceDirError, seasons] = await Promise.all([
      slug === current.slug
        ? []
        : db
            .select({ id: contentColumns.id })
            .from(schema.contents)
            .where(
              and(eq(schema.contents.slug, slug), ne(schema.contents.id, current.id))
            )
            .limit(1),
      checkSourceDir(values.sourceDir),
      isMoved
        ? db
            .select(seasonPathFields)
            .from(schema.seasons)
            .where(eq(schema.seasons.contentId, current.id))
        : []
    ])

    if (sourceDirError) {
      return { ok: false as const, errors: { sourceDir: [sourceDirError] } }
    }
    if (taken) {
      return {
        ok: false as const,
        message: `The new title's slug "${slug}" is already used by another content`
      }
    }

    /**
     * `set` skips `undefined`, so an optional field the form cleared is written as `null` explicitly.
     */
    await db
      .update(schema.contents)
      .set({
        ...values,
        slug,
        source: values.source ?? null,
        synopsis: values.synopsis ?? null
      })
      .where(eq(schema.contents.id, current.id))

    updateTag("contents/list")
    updateTag(`contents/${current.id}`)
    updateTag(`contents/${current.id}/episodes`)

    const outside = seasons.filter(
      (season) => seasonArtDirectory(values.sourceDir, season) === null
    ).length

    return {
      ok: true as const,
      content: { id: current.id, slug },
      warning:
        outside > 0
          ? `${outside} season${outside === 1 ? " has" : "s have"} sources outside the new folder and can't be imported again`
          : null
    }
  }
)

/**
 * Saves the control panel's edit-season form with the same checks as `createSeason`: sources and poster on
 * disk, the primary source not already imported by another season, and the season number free. Staff only.
 *
 * A season can't move to another content. Removing a source keeps the tracks already imported from it (tracks
 * aren't tied to `sources`), so the result carries a `warning` naming the removed languages.
 *
 * @param seasonId - `seasons.id`
 * @param input - The form values, validated with `seasonValidator`
 * @returns `{ ok: true, season, warning }`, or field `errors` / a `message` for expected failures
 */
export const updateSeason = withRole(
  STAFF_ROLES,
  async (_account, seasonId: unknown, input: unknown) => {
    const id = z.uuid().safeParse(seasonId)
    const parsed = seasonValidator.safeParse(input)
    if (!id.success) {
      return { ok: false as const, message: "Season not found" }
    }
    if (!parsed.success) {
      return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
    }

    const values = parsed.data
    const primary = primarySource(values.sources)
    if (!primary) {
      return { ok: false as const, errors: { sources: ["Add at least one source"] } }
    }

    const [[current], [duplicate], [sameNumber], sourceErrors, posterError] =
      await Promise.all([
        db
          .select(currentSeasonFields)
          .from(schema.seasons)
          .where(eq(schema.seasons.id, id.data))
          .limit(1),
        db
          .select({ id: seasonColumns.id })
          .from(schema.seasons)
          .where(
            and(
              ne(schema.seasons.id, id.data),
              sql`${schema.seasons.sources} @> ${JSON.stringify([{ pathname: primary.pathname }])}::jsonb`
            )
          )
          .limit(1),
        values.kind === "season" && values.seasonNo !== undefined
          ? db
              .select({ id: seasonColumns.id })
              .from(schema.seasons)
              .where(
                and(
                  ne(schema.seasons.id, id.data),
                  eq(schema.seasons.contentId, values.contentId),
                  eq(schema.seasons.kind, "season"),
                  eq(schema.seasons.seasonNo, values.seasonNo)
                )
              )
              .limit(1)
          : [],
        Promise.all(
          values.sources.map((source) =>
            checkSourcePath(source, values.kind, source === primary)
          )
        ),
        checkArtPath(values.poster)
      ])

    if (!current) {
      return { ok: false as const, message: "Season not found" }
    }
    if (current.contentId !== values.contentId) {
      return { ok: false as const, message: "A season can't move to another content" }
    }

    const sourceError = sourceErrors.filter((error) => error !== null)
    if (sourceError.length > 0 || posterError || sameNumber) {
      return {
        ok: false as const,
        errors: {
          ...(sourceError.length > 0 && { sources: sourceError }),
          ...(posterError && { poster: [posterError] }),
          ...(sameNumber && {
            seasonNo: [`Season ${values.seasonNo} already exists for this content`]
          })
        }
      }
    }
    if (duplicate) {
      return {
        ok: false as const,
        message: `Another season was already imported from ${primary.pathname}`
      }
    }

    /**
     * `set` skips `undefined`, so an optional field the form cleared is written as `null` explicitly.
     */
    await db
      .update(schema.seasons)
      .set({
        kind: values.kind,
        seasonNo: values.seasonNo ?? null,
        title: values.title ?? null,
        synopsis: values.synopsis ?? null,
        status: values.status,
        sources: values.sources,
        poster: values.poster,
        releasedOn: values.releasedOn
      })
      .where(eq(schema.seasons.id, current.id))

    updateTag("seasons/list")
    updateTag(`seasons/${current.id}`)
    updateTag(`seasons/${current.id}/episodes`)
    updateTag(`contents/${current.contentId}/episodes`)

    const languages = new Set(values.sources.map((source) => source.language))
    const removed = current.sources
      .filter((source) => !languages.has(source.language))
      .map((source) => source.language)

    return {
      ok: true as const,
      season: { id: current.id },
      warning: removed.length
        ? `Tracks already imported for ${removed.join(", ")} stay playable`
        : null
    }
  }
)
