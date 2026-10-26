import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  notInArray,
  sql,
  type SQL
} from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { pick } from "es-toolkit"
import { z } from "zod"

import { withAuth } from "@/actions/auth"
import {
  ADULT_KINDS,
  HISTORY_KIND_FILTERS,
  HISTORY_PAGE_SIZE,
  ON_HOLD_AFTER_DAYS,
  type HistoryStatus
} from "@/constants"
import { db, schema } from "@/drizzle"
import {
  contentColumns,
  episodeColumns,
  seasonColumns,
  watchHistoryColumns
} from "@/drizzle/table-columns"
import { lastPageOf, toPagination, withPagination } from "@/drizzle/utils"

import { historyValidator, type HistoryValidator } from "../validator.zod"

const nextEpisodes = alias(schema.episodes, "next_episodes")
const nextSeasons = alias(schema.seasons, "next_seasons")

/**
 * The episode after the saved one in the same content, for a row whose saved episode is finished. Ordered like
 * `readContentEpisodes` (season release date, then `episodeNo`), and joined to `tracks` so an episode with
 * nothing to play is skipped; the first track by the same original-first order gives its duration.
 *
 * Every field is aliased: both tables have `id`, `kind`, and `title`, which would collide in the subquery.
 */
const nextEpisode = db
  .select({
    id: sql<string>`${nextEpisodes.id}`.as("next_episode_id"),
    episodeNo: sql<number>`${nextEpisodes.episodeNo}`.as("next_episode_no"),
    kind: sql<Content.EpisodeKind>`${nextEpisodes.kind}`.as("next_episode_kind"),
    title: sql<string | null>`${nextEpisodes.title}`.as("next_episode_title"),
    hasThumbnail: sql<boolean>`${nextEpisodes.thumbnail} is not null`.as(
      "next_episode_has_thumbnail"
    ),
    seasonId: sql<string>`${nextSeasons.id}`.as("next_season_id"),
    seasonKind: sql<Content.SeasonKind>`${nextSeasons.kind}`.as("next_season_kind"),
    seasonNo: sql<number | null>`${nextSeasons.seasonNo}`.as("next_season_no"),
    seasonTitle: sql<string | null>`${nextSeasons.title}`.as("next_season_title"),
    duration: sql<number>`${schema.tracks.duration}`.as("next_duration_seconds")
  })
  .from(nextEpisodes)
  .innerJoin(nextSeasons, eq(nextEpisodes.seasonId, nextSeasons.id))
  .innerJoin(schema.tracks, eq(schema.tracks.episodeId, nextEpisodes.id))
  .where(
    and(
      isNotNull(schema.watchHistories.completedAt),
      eq(nextSeasons.contentId, schema.watchHistories.contentId),
      sql`(${nextSeasons.releasedOn}, ${nextSeasons.createdAt}, ${nextSeasons.id}, ${nextEpisodes.episodeNo})
        > (${schema.seasons.releasedOn}, ${schema.seasons.createdAt}, ${schema.seasons.id}, ${schema.episodes.episodeNo})`
    )
  )
  .orderBy(
    asc(nextSeasons.releasedOn),
    asc(nextSeasons.createdAt),
    asc(nextSeasons.id),
    asc(nextEpisodes.episodeNo),
    asc(schema.tracks.isDubbed),
    asc(schema.tracks.language)
  )
  .limit(1)
  .as("next_episode")

/**
 * A row's status, derived rather than stored: `completed_at` only says the saved episode is finished, so the
 * content counts as completed when no episode comes after it.
 */
const historyStatus = sql<HistoryStatus>`case
  when ${schema.watchHistories.completedAt} is not null and ${nextEpisode.id} is null then 'completed'
  when ${schema.watchHistories.watchedAt} < now() - make_interval(days => ${ON_HOLD_AFTER_DAYS}) then 'on_hold'
  else 'watching'
end`

/**
 * Picked outside the `withAuth` callback: inline, TypeScript infers `pick`'s keys from the callback's generic
 * return type and types the row as the whole table.
 */
const historyFields = {
  history: pick(watchHistoryColumns, [
    "id",
    "positionSeconds",
    "durationSeconds",
    "completedAt",
    "watchedAt"
  ]),
  episode: {
    ...pick(episodeColumns, ["id", "episodeNo", "kind", "title"]),
    hasThumbnail: sql<boolean>`${schema.episodes.thumbnail} is not null`
  },
  season: pick(seasonColumns, ["id", "kind", "seasonNo", "title"]),
  content: pick(contentColumns, ["id", "kind", "title", "altTitles", "genres"]),
  next: {
    id: nextEpisode.id,
    episodeNo: nextEpisode.episodeNo,
    kind: nextEpisode.kind,
    title: nextEpisode.title,
    hasThumbnail: nextEpisode.hasThumbnail,
    seasonId: nextEpisode.seasonId,
    seasonKind: nextEpisode.seasonKind,
    seasonNo: nextEpisode.seasonNo,
    seasonTitle: nextEpisode.seasonTitle,
    duration: nextEpisode.duration
  },
  status: historyStatus
}

/**
 * Lists the signed-in account's watch history, one row per content: filtered by kind and status, sorted, and
 * paginated. Per-user, so not cached.
 *
 * Each row carries the saved episode and, when that episode is finished, the next one (`next`), so the page can
 * offer it without another query. No file path leaves the reader.
 *
 * @param input - Filters, validated with `historyValidator`
 * @returns `{ ok: true, data: Pagination<…> }`, or `{ ok: false, errors }` for invalid input. A page past the
 * end is clamped to the last page.
 */
export const readWatchHistories = withAuth(async (account, input: unknown) => {
  const parsed = historyValidator.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
  }

  const { page } = parsed.data
  const where = and(
    eq(schema.watchHistories.accountId, account.id),
    ...historyFilters(parsed.data)
  )
  const orderBy = historyOrder(parsed.data)

  const readPage = (pageNo: number) =>
    withPagination(
      db
        .select(historyFields)
        .from(schema.watchHistories)
        .innerJoin(
          schema.episodes,
          eq(schema.watchHistories.episodeId, schema.episodes.id)
        )
        .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
        .innerJoin(
          schema.contents,
          eq(schema.watchHistories.contentId, schema.contents.id)
        )
        .leftJoinLateral(nextEpisode, sql`true`)
        .where(where)
        .orderBy(...orderBy)
        .$dynamic(),
      pageNo,
      HISTORY_PAGE_SIZE
    )

  /**
   * Count and rows run together; only a jump past the last page pays for a second read. The count needs the
   * same joins, since the status filter reads the next episode.
   */
  const [[{ total }], rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(schema.watchHistories)
      .innerJoin(schema.episodes, eq(schema.watchHistories.episodeId, schema.episodes.id))
      .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
      .innerJoin(schema.contents, eq(schema.watchHistories.contentId, schema.contents.id))
      .leftJoinLateral(nextEpisode, sql`true`)
      .where(where),
    readPage(page)
  ])

  const currentPage = Math.min(page, lastPageOf(total, HISTORY_PAGE_SIZE))
  const pageRows = currentPage === page ? rows : await readPage(currentPage)

  /**
   * Drizzle doesn't null a nested object whose fields come from a left-joined subquery: without a next
   * episode it returns `next` with every field `null`, so collapse that to `null` here.
   */
  const data = pageRows.map(({ next, ...row }) => ({
    ...row,
    next: next.id === null ? null : next
  }))

  return {
    ok: true as const,
    data: toPagination(data, total, currentPage, HISTORY_PAGE_SIZE)
  }
})

export type HistoryRow = Extract<
  Awaited<ReturnType<typeof readWatchHistories>>,
  { ok: true }
>["data"]["data"][number]

/**
 * Builds the `where` conditions; filters that aren't set add nothing.
 */
function historyFilters({ kind, status }: HistoryValidator) {
  const filters: SQL[] = []

  if (kind) filters.push(inArray(schema.contents.kind, HISTORY_KIND_FILTERS[kind]))
  else filters.push(notInArray(schema.contents.kind, ADULT_KINDS))

  if (status) filters.push(sql`${historyStatus} = ${status}`)

  return filters
}

/**
 * Builds the `order by`. `recent` and `oldest` follow `watch_histories_account_watched_at_index`, and the row
 * ID breaks ties so offset pagination never repeats or skips a row.
 */
function historyOrder({ sort }: HistoryValidator) {
  if (sort === "title") {
    return [
      asc(schema.contents.title),
      desc(schema.watchHistories.watchedAt),
      asc(schema.watchHistories.id)
    ]
  }

  return [
    sort === "oldest"
      ? asc(schema.watchHistories.watchedAt)
      : desc(schema.watchHistories.watchedAt),
    asc(schema.watchHistories.id)
  ]
}
