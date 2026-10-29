import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  inArray,
  or,
  sql,
  type AnyColumn,
  type SQL
} from "drizzle-orm"
import { pick } from "es-toolkit"

import { withRole } from "@/actions/auth"
import { seasonSearch, seasonSearchRank } from "@/actions/contents/search"
import {
  AUDIO_LANGUAGES,
  SEASONALS,
  STAFF_ROLES,
  type Audio,
  type Order,
  type Seasonal,
  type SeasonTableSort
} from "@/constants"
import { db, schema } from "@/drizzle"
import { contentColumns, seasonColumns } from "@/drizzle/table-columns"
import { lastPageOf, toPagination, withPagination } from "@/drizzle/utils"

/**
 * The seasons table's filters. A list matches any of its values, except `genres`, which must all be on the
 * content (like `/browse`); an empty list or a missing filter matches everything.
 */
export type SeasonRowFilters = {
  contentId?: string
  seasonKinds?: readonly Content.SeasonKind[]
  statuses?: readonly Content.SeasonStatus[]
  kinds?: readonly Content.Kind[]
  sources?: readonly Content.Source[]
  genres?: readonly string[]
  audios?: readonly Audio[]
  seasonals?: readonly Seasonal[]
  search?: string | null
}

/**
 * `sort: null` orders by relevance while searching, otherwise by release date.
 */
export type SeasonRowQuery = {
  page: number
  take: number
  sort: SeasonTableSort | null
  order: Order
}

const episodeCount = sql<number>`(select count(*)::int from ${schema.episodes} where ${schema.episodes.seasonId} = ${schema.seasons.id})`

/**
 * Picked outside the `withRole` callback: inline, TypeScript infers `pick`'s keys from the callback's generic
 * return type and types the row as the whole table.
 */
const seasonRowFields = {
  season: pick(seasonColumns, [
    "id",
    "kind",
    "seasonNo",
    "title",
    "status",
    "releasedOn",
    "sources"
  ]),
  content: pick(contentColumns, ["id", "title", "kind"]),
  episodes: episodeCount
}

/**
 * The columns each sort orders by, before the release-date tie-break.
 */
const SORT_COLUMNS: Record<SeasonTableSort, (AnyColumn | SQL)[]> = {
  title: [schema.contents.title],
  kind: [schema.seasons.kind],
  status: [schema.seasons.status],
  episodes: [episodeCount],
  released: []
}

/**
 * Builds the `where` of the seasons table from its filters; an empty list means no filter.
 */
function seasonRowWhere({
  contentId,
  seasonKinds,
  statuses,
  kinds,
  sources,
  genres,
  audios,
  seasonals,
  search
}: SeasonRowFilters) {
  return and(
    contentId ? eq(schema.seasons.contentId, contentId) : undefined,
    seasonKinds?.length ? inArray(schema.seasons.kind, [...seasonKinds]) : undefined,
    statuses?.length ? inArray(schema.seasons.status, [...statuses]) : undefined,
    kinds?.length ? inArray(schema.contents.kind, [...kinds]) : undefined,
    sources?.length ? inArray(schema.contents.source, [...sources]) : undefined,
    genres?.length ? arrayContains(schema.contents.genres, [...genres]) : undefined,
    audios?.length
      ? or(
          ...audios.map(
            (audio) =>
              sql`${schema.seasons.sources} @> ${JSON.stringify([{ language: AUDIO_LANGUAGES[audio] }])}::jsonb`
          )
        )
      : undefined,
    seasonals?.length
      ? inArray(
          sql`extract(quarter from ${schema.seasons.releasedOn})`,
          seasonals.map((seasonal) => SEASONALS.indexOf(seasonal) + 1)
        )
      : undefined,
    search ? seasonSearch(search) : undefined
  )
}

/**
 * The `order by` of the seasons table: the sorted column, then release date, creation, and ID so offset
 * pagination never repeats or skips a row. Without a sort, a search ranks best matches first.
 */
function seasonRowOrder({ sort, order }: SeasonRowQuery, search?: string | null) {
  const direction = order === "asc" ? asc : desc
  const tieBreak = [
    direction(schema.seasons.releasedOn),
    direction(schema.seasons.createdAt),
    asc(schema.seasons.id)
  ]

  if (!sort && search) return [seasonSearchRank(search), ...tieBreak]
  return [
    ...SORT_COLUMNS[sort ?? "released"].map((column) => direction(column)),
    ...tieBreak
  ]
}

/**
 * Lists seasons for the control panel's seasons table, with their content and how many episodes are
 * imported, filtered, sorted, and paginated. Shared by a content's page and `/ctrl/seasons`. Not cached: staff
 * must see their own edits at once.
 *
 * Rows include `sources`, file paths and all: the table renders on the server, and only staff reach it.
 *
 * @param filters - Which seasons to list
 * @param query - The table's page, page size, and sort, already parsed by the page
 * @returns One page of seasons; a page past the end is clamped to the last page
 */
export const readSeasonRows = withRole(
  STAFF_ROLES,
  async (_account, filters: SeasonRowFilters, query: SeasonRowQuery) => {
    const { page, take } = query
    const where = seasonRowWhere(filters)
    const orderBy = seasonRowOrder(query, filters.search)

    const readPage = (pageNo: number) =>
      withPagination(
        db
          .select(seasonRowFields)
          .from(schema.seasons)
          .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
          .where(where)
          .orderBy(...orderBy)
          .$dynamic(),
        pageNo,
        take
      )

    /**
     * Count and rows run together; only a jump past the last page pays for a second read.
     */
    const [[{ total }], rows] = await Promise.all([
      db
        .select({ total: count() })
        .from(schema.seasons)
        .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
        .where(where),
      readPage(page)
    ])

    const currentPage = Math.min(page, lastPageOf(total, take))
    const pageRows = currentPage === page ? rows : await readPage(currentPage)

    return toPagination(pageRows, total, currentPage, take)
  }
)

export type SeasonRow = Awaited<ReturnType<typeof readSeasonRows>>["data"][number]
