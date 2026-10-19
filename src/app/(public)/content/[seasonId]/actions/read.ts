import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm"
import { groupBy, pick, uniqBy } from "es-toolkit"
import { cacheLife, cacheTag } from "next/cache"

import { readSessionAccount } from "@/actions/auth"
import { db, schema } from "@/drizzle"
import {
  contentColumns,
  episodeColumns,
  seasonColumns,
  trackColumns
} from "@/drizzle/table-columns"

/**
 * Looks up a season with its content, and the content's other seasons for the sidebar, without any file path.
 *
 * Both queries take only `seasonId` (the sibling list finds the content through a subquery), so they run
 * together. Tagged with the list tags too, so importing a content or a season refreshes the sidebar.
 *
 * @param seasonId - `seasons.id`, already validated as a UUID
 * @returns The season, its content, and its sibling seasons by release date, or `null` when no season has
 * that ID
 */
export async function readSeasonDetail(seasonId: string) {
  "use cache"
  cacheTag(`seasons/${seasonId}`, "contents/list", "seasons/list")
  cacheLife("hours")

  const contentOfSeason = db
    .select({ contentId: schema.seasons.contentId })
    .from(schema.seasons)
    .where(eq(schema.seasons.id, seasonId))

  const [[current], seasons] = await Promise.all([
    db
      .select({
        season: pick(seasonColumns, [
          "id",
          "kind",
          "seasonNo",
          "title",
          "synopsis",
          "status",
          "releasedOn"
        ]),
        content: pick(contentColumns, [
          "id",
          "title",
          "altTitles",
          "kind",
          "source",
          "genres",
          "synopsis"
        ])
      })
      .from(schema.seasons)
      .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
      .where(eq(schema.seasons.id, seasonId))
      .limit(1),
    db
      .select(pick(seasonColumns, ["id", "kind", "seasonNo", "title", "releasedOn"]))
      .from(schema.seasons)
      .where(inArray(schema.seasons.contentId, contentOfSeason))
      .orderBy(
        asc(schema.seasons.releasedOn),
        asc(schema.seasons.createdAt),
        asc(schema.seasons.id)
      )
  ])

  if (!current) return null

  return {
    ...current,
    otherSeasons: seasons.filter((season) => season.id !== seasonId)
  }
}

export type SeasonDetail = NonNullable<Awaited<ReturnType<typeof readSeasonDetail>>>

/**
 * Lists a season's episodes with the audio languages each one can play.
 *
 * `hasThumbnail` stands in for the thumbnail path, so the page knows whether `/api/art/thumbnail/[id]` has an
 * image without the path ever leaving the server.
 *
 * @param seasonId - `seasons.id`
 * @returns Episodes by `episodeNo`, each with its audios original-first (empty when no track is imported yet)
 */
export async function readSeasonEpisodes(seasonId: string) {
  "use cache"
  cacheTag(`seasons/${seasonId}/episodes`)
  cacheLife("hours")

  const rows = await db
    .select({
      episode: {
        ...pick(episodeColumns, ["id", "episodeNo", "kind", "title"]),
        hasThumbnail: sql<boolean>`${schema.episodes.thumbnail} is not null`
      },
      track: pick(trackColumns, ["language", "isDubbed"])
    })
    .from(schema.episodes)
    .leftJoin(schema.tracks, eq(schema.tracks.episodeId, schema.episodes.id))
    .where(eq(schema.episodes.seasonId, seasonId))
    .orderBy(
      asc(schema.episodes.episodeNo),
      asc(schema.tracks.isDubbed),
      asc(schema.tracks.language)
    )

  const tracksByEpisode = groupBy(rows, (row) => row.episode.id)

  return uniqBy(rows, (row) => row.episode.id).map(({ episode }) => ({
    ...episode,
    audios: tracksByEpisode[episode.id].flatMap((row) => (row.track ? [row.track] : []))
  }))
}

export type SeasonEpisode = Awaited<ReturnType<typeof readSeasonEpisodes>>[number]

/**
 * Finds the episode of a season the signed-in account stopped partway through. Per-user, so not cached.
 *
 * `watch_histories` keeps one row per account per content, so at most one episode is in progress; a finished
 * one (`completedAt` set) doesn't count.
 *
 * @param seasonId - `seasons.id`
 * @returns The episode's ID, or `null` when signed out or nothing in this season is in progress
 */
export async function readResumeEpisodeId(seasonId: string) {
  const account = await readSessionAccount()
  if (!account) return null

  const [row] = await db
    .select({ episodeId: schema.watchHistories.episodeId })
    .from(schema.watchHistories)
    .innerJoin(schema.episodes, eq(schema.watchHistories.episodeId, schema.episodes.id))
    .where(
      and(
        eq(schema.watchHistories.accountId, account.id),
        eq(schema.episodes.seasonId, seasonId),
        isNull(schema.watchHistories.completedAt)
      )
    )
    .limit(1)

  return row?.episodeId ?? null
}
