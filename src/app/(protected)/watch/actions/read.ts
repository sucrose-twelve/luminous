import { and, asc, eq, sql } from "drizzle-orm"
import { groupBy, pick, uniqBy } from "es-toolkit"
import { cacheLife, cacheTag } from "next/cache"

import { withAuth } from "@/actions/auth"
import { db, schema } from "@/drizzle"
import {
  contentColumns,
  episodeColumns,
  preferenceColumns,
  seasonColumns,
  trackColumns,
  watchHistoryColumns
} from "@/drizzle/table-columns"

/**
 * Looks up the episode to play with its season, content, and every audio track, without any file path.
 *
 * Unlike the stream route's `readTrack`, the result is safe to pass to a Client Component: each track holds
 * its playback manifest but not `path`, `sources`, or the art paths. The page picks one track with
 * `pickTrack`, so all of them are read at once (an episode has a handful).
 *
 * @param episodeId - `episodes.id`, already validated as a UUID
 * @returns The episode, its parents, and its tracks original-first, or `null` when no episode has that ID
 */
export async function readWatchEpisode(episodeId: string) {
  "use cache"
  cacheTag(`episodes/${episodeId}`)
  cacheLife("hours")

  const rows = await db
    .select({
      track: pick(trackColumns, [
        "id",
        "language",
        "isDubbed",
        "mimeCodec",
        "duration",
        "initEnd",
        "fragments"
      ]),
      episode: pick(episodeColumns, [
        "id",
        "episodeNo",
        "kind",
        "title",
        "skips",
        "spriteGrid"
      ]),
      season: pick(seasonColumns, ["id", "kind", "seasonNo", "title"]),
      content: pick(contentColumns, ["id", "slug", "title"])
    })
    .from(schema.episodes)
    .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
    .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
    .leftJoin(schema.tracks, eq(schema.tracks.episodeId, schema.episodes.id))
    .where(eq(schema.episodes.id, episodeId))
    .orderBy(asc(schema.tracks.isDubbed), asc(schema.tracks.language))

  const [first] = rows
  if (!first) return null

  const { episode, season, content } = first
  /**
   * The episode carries its season's and content's names, so editing either in the control panel must reach
   * it; tagging by them lets those edits expire one tag instead of every episode below.
   */
  cacheTag(`contents/${content.id}`, `seasons/${season.id}`)

  return {
    episode,
    season,
    content,
    tracks: rows.flatMap((row) => (row.track ? [row.track] : []))
  }
}

export type WatchEpisode = NonNullable<Awaited<ReturnType<typeof readWatchEpisode>>>

export type WatchTrack = WatchEpisode["tracks"][number]

/**
 * Lists every episode of a content across all its seasons, each with the audio tracks it can play.
 *
 * Feeds the Playlist panel, prev / next, and the audio track menu, so one query serves all three.
 * `hasThumbnail` stands in for the thumbnail path, so the playlist knows whether `/api/art/thumbnail/[id]` has
 * an image without exposing the path. Episodes
 * are ordered by season release date, then `episodeNo`, and their tracks original-first, which is the order
 * `pickTrack` falls back on.
 *
 * @param contentId - `contents.id`
 * @returns `seasons` that have at least one episode, and the flat, ordered `episodes`
 */
export async function readContentEpisodes(contentId: string) {
  "use cache"
  cacheTag(`contents/${contentId}/episodes`)
  cacheLife("hours")

  const rows = await db
    .select({
      season: pick(seasonColumns, ["id", "kind", "seasonNo", "title"]),
      episode: {
        ...pick(episodeColumns, ["id", "seasonId", "episodeNo", "kind", "title"]),
        hasThumbnail: sql<boolean>`${schema.episodes.thumbnail} is not null`
      },
      track: pick(trackColumns, ["id", "language", "isDubbed"])
    })
    .from(schema.seasons)
    .innerJoin(schema.episodes, eq(schema.episodes.seasonId, schema.seasons.id))
    .leftJoin(schema.tracks, eq(schema.tracks.episodeId, schema.episodes.id))
    .where(eq(schema.seasons.contentId, contentId))
    .orderBy(
      asc(schema.seasons.releasedOn),
      asc(schema.seasons.createdAt),
      asc(schema.seasons.id),
      asc(schema.episodes.episodeNo),
      asc(schema.tracks.isDubbed),
      asc(schema.tracks.language)
    )

  const tracksByEpisode = groupBy(rows, (row) => row.episode.id)

  return {
    seasons: uniqBy(
      rows.map((row) => row.season),
      (season) => season.id
    ),
    episodes: uniqBy(rows, (row) => row.episode.id).map(({ season, episode }) => ({
      ...episode,
      seasonKind: season.kind,
      seasonNo: season.seasonNo,
      tracks: tracksByEpisode[episode.id].flatMap((row) => (row.track ? [row.track] : []))
    }))
  }
}

export type ContentEpisodes = Awaited<ReturnType<typeof readContentEpisodes>>

/**
 * Picked outside the `withAuth` callbacks: inline, TypeScript infers `pick`'s keys from the callback's generic
 * return type and types the row as the whole table.
 */
const progressColumns = pick(watchHistoryColumns, [
  "episodeId",
  "positionSeconds",
  "completedAt"
])
const playbackPreferenceColumns = pick(preferenceColumns, [
  "audioLanguage",
  "autoplayNext",
  "autoSkip"
])

/**
 * Reads where the signed-in account stopped in a content. Per-user, so not cached.
 *
 * @param contentId - `contents.id`
 * @returns The account's `watch_histories` row for the content, or `null` when it never watched it
 */
export const readProgress = withAuth(async (account, contentId: string) => {
  const [row] = await db
    .select(progressColumns)
    .from(schema.watchHistories)
    .where(
      and(
        eq(schema.watchHistories.accountId, account.id),
        eq(schema.watchHistories.contentId, contentId)
      )
    )
    .limit(1)

  return row ?? null
})

export type WatchProgress = NonNullable<Awaited<ReturnType<typeof readProgress>>>

/**
 * Reads the signed-in account's playback preferences. Per-user, so not cached.
 *
 * @returns The account's `preferences` row, or `null` for an account that never saved one (use the defaults)
 */
export const readPreference = withAuth(async (account) => {
  const [row] = await db
    .select(playbackPreferenceColumns)
    .from(schema.preferences)
    .where(eq(schema.preferences.accountId, account.id))
    .limit(1)

  return row ?? null
})

export type WatchPreference = NonNullable<Awaited<ReturnType<typeof readPreference>>>
