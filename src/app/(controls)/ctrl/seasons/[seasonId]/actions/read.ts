import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  sql,
  type AnyColumn,
  type SQL
} from "drizzle-orm"
import { omit, pick } from "es-toolkit"

import { withRole } from "@/actions/auth"
import { AUDIO_LANGUAGES, STAFF_ROLES, type EpisodeTableSort } from "@/constants"
import type { Locales } from "@/constants/enum"
import { db, schema } from "@/drizzle"
import { contentColumns, episodeColumns, seasonColumns } from "@/drizzle/table-columns"
import { lastPageOf, toPagination, withPagination } from "@/drizzle/utils"
import { pathType, seasonArtDirectory } from "@/libs/media"

import type { QueryValidator } from "../validator.nuqs"

/**
 * Picked outside the `withRole` callback: inline, TypeScript infers `pick`'s keys from the callback's generic
 * return type and types the row as the whole table.
 */
const seasonFields = {
  season: omit(seasonColumns, ["contentId"]),
  content: pick(contentColumns, ["id", "title", "kind", "sourceDir"])
}

/**
 * Loads a season for its control panel page: every column, its content, how many episodes are imported, and per
 * source whether its path is on disk and how many tracks came from it. Not cached: staff must see their own
 * edits and imports at once.
 *
 * @param seasonId - `seasons.id`, already validated as a UUID
 * @returns The season, or `null` when no season has that ID
 */
export const readControlSeason = withRole(
  STAFF_ROLES,
  async (_account, seasonId: string) => {
    const [row] = await db
      .select(seasonFields)
      .from(schema.seasons)
      .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
      .where(eq(schema.seasons.id, seasonId))
      .limit(1)
    if (!row) return null

    const [trackCounts, [{ episodes }], pathTypes] = await Promise.all([
      db
        .select({ language: schema.tracks.language, total: count() })
        .from(schema.tracks)
        .innerJoin(schema.episodes, eq(schema.tracks.episodeId, schema.episodes.id))
        .where(eq(schema.episodes.seasonId, seasonId))
        .groupBy(schema.tracks.language),
      db
        .select({ episodes: count() })
        .from(schema.episodes)
        .where(eq(schema.episodes.seasonId, seasonId)),
      Promise.all(row.season.sources.map((source) => pathType(source.pathname)))
    ])

    return {
      ...row,
      episodes,
      artDirectory: seasonArtDirectory(row.content.sourceDir, row.season),
      sources: row.season.sources.map((source, index) => ({
        ...source,
        isOnDisk: pathTypes[index] !== null,
        tracks:
          trackCounts.find((track) => track.language === source.language)?.total ?? 0
      }))
    }
  }
)

export type ControlSeason = NonNullable<Awaited<ReturnType<typeof readControlSeason>>>

/**
 * An episode's imported audio languages, original first, the order the player falls back on.
 */
const trackLanguages = sql<
  Locales[]
>`coalesce((select array_agg(${schema.tracks.language} order by ${schema.tracks.isDubbed}, ${schema.tracks.language})::text[] from ${schema.tracks} where ${schema.tracks.episodeId} = ${schema.episodes.id}), '{}')`

/**
 * An episode's length, from its first track in the same order.
 */
const trackDuration = sql<
  number | null
>`(select ${schema.tracks.duration} from ${schema.tracks} where ${schema.tracks.episodeId} = ${schema.episodes.id} order by ${schema.tracks.isDubbed}, ${schema.tracks.language} limit 1)`

const episodeFields = {
  ...pick(episodeColumns, ["id", "episodeNo", "kind", "title", "airedOn", "skips"]),
  hasThumbnail: sql<boolean>`${schema.episodes.thumbnail} is not null`,
  languages: trackLanguages,
  duration: trackDuration
}

const SORT_COLUMNS: Record<EpisodeTableSort, AnyColumn | SQL> = {
  number: schema.episodes.episodeNo,
  kind: schema.episodes.kind,
  duration: trackDuration,
  aired: schema.episodes.airedOn
}

/**
 * Lists a season's episodes for its control panel page, each with its imported languages and length, filtered
 * by kind and by an audio it has a track in, sorted, and paginated. Not cached, like `readControlSeason`.
 *
 * @param seasonId - `seasons.id`, already validated as a UUID
 * @param query - The page's search params, already parsed by `queryValidator`
 * @returns One page of episodes; a page past the end is clamped to the last page
 */
export const readSeasonEpisodes = withRole(
  STAFF_ROLES,
  async (
    _account,
    seasonId: string,
    { page, take, sort, order, kind, audio }: QueryValidator
  ) => {
    const where = and(
      eq(schema.episodes.seasonId, seasonId),
      kind ? eq(schema.episodes.kind, kind) : undefined,
      audio
        ? exists(
            db
              .select({ id: schema.tracks.id })
              .from(schema.tracks)
              .where(
                and(
                  eq(schema.tracks.episodeId, schema.episodes.id),
                  eq(schema.tracks.language, AUDIO_LANGUAGES[audio])
                )
              )
          )
        : undefined
    )
    const direction = order === "asc" ? asc : desc

    const readPage = (pageNo: number) =>
      withPagination(
        db
          .select(episodeFields)
          .from(schema.episodes)
          .where(where)
          .orderBy(
            direction(SORT_COLUMNS[sort]),
            asc(schema.episodes.episodeNo),
            asc(schema.episodes.id)
          )
          .$dynamic(),
        pageNo,
        take
      )

    /**
     * Count and rows run together; only a jump past the last page pays for a second read.
     */
    const [[{ total }], rows] = await Promise.all([
      db.select({ total: count() }).from(schema.episodes).where(where),
      readPage(page)
    ])

    const currentPage = Math.min(page, lastPageOf(total, take))
    const pageRows = currentPage === page ? rows : await readPage(currentPage)

    return toPagination(pageRows, total, currentPage, take)
  }
)

export type ControlEpisodeRow = Awaited<
  ReturnType<typeof readSeasonEpisodes>
>["data"][number]
