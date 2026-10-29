import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm"
import { omit, pick } from "es-toolkit"

import { withRole } from "@/actions/auth"
import { STAFF_ROLES } from "@/constants"
import { db, schema } from "@/drizzle"
import {
  contentColumns,
  episodeColumns,
  seasonColumns,
  trackColumns
} from "@/drizzle/table-columns"

/**
 * Picked outside the `withRole` callback: inline, TypeScript infers `pick`'s keys from the callback's generic
 * return type and types the row as the whole table.
 */
const episodeFields = {
  episode: omit(episodeColumns, ["seasonId"]),
  season: pick(seasonColumns, [
    "id",
    "kind",
    "seasonNo",
    "title",
    "status",
    "releasedOn",
    "sources"
  ]),
  content: pick(contentColumns, ["id", "title"])
}

const trackFields = {
  ...pick(trackColumns, [
    "id",
    "language",
    "isDubbed",
    "path",
    "mimeCodec",
    "size",
    "duration",
    "width",
    "height"
  ]),
  fragments: sql<number>`jsonb_array_length(${schema.tracks.fragments})`
}

const neighbourFields = pick(episodeColumns, ["id", "episodeNo"])

/**
 * Loads an episode for its control panel page: every column (art paths included), its season and content, its
 * tracks original-first, and the episodes before and after it. Not cached: staff must see their own edits at
 * once.
 *
 * @param seasonId - `seasons.id` from the URL; an episode of another season counts as not found
 * @param episodeId - `episodes.id`, already validated as a UUID
 * @returns The episode, or `null` when the season has no episode with that ID
 */
export const readControlEpisode = withRole(
  STAFF_ROLES,
  async (_account, seasonId: string, episodeId: string) => {
    const [row] = await db
      .select(episodeFields)
      .from(schema.episodes)
      .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
      .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
      .where(
        and(eq(schema.episodes.id, episodeId), eq(schema.episodes.seasonId, seasonId))
      )
      .limit(1)
    if (!row) return null

    const [tracks, [previous], [next]] = await Promise.all([
      db
        .select(trackFields)
        .from(schema.tracks)
        .where(eq(schema.tracks.episodeId, episodeId))
        .orderBy(asc(schema.tracks.isDubbed), asc(schema.tracks.language)),
      db
        .select(neighbourFields)
        .from(schema.episodes)
        .where(
          and(
            eq(schema.episodes.seasonId, seasonId),
            lt(schema.episodes.episodeNo, row.episode.episodeNo)
          )
        )
        .orderBy(desc(schema.episodes.episodeNo))
        .limit(1),
      db
        .select(neighbourFields)
        .from(schema.episodes)
        .where(
          and(
            eq(schema.episodes.seasonId, seasonId),
            gt(schema.episodes.episodeNo, row.episode.episodeNo)
          )
        )
        .orderBy(asc(schema.episodes.episodeNo))
        .limit(1)
    ])

    return { ...row, tracks, previous: previous ?? null, next: next ?? null }
  }
)

export type ControlEpisode = NonNullable<Awaited<ReturnType<typeof readControlEpisode>>>
