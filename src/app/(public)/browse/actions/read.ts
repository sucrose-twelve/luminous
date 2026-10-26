"use server"

import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  notInArray,
  or,
  sql,
  type SQL
} from "drizzle-orm"
import { pick } from "es-toolkit"
import { z } from "zod"

import { ADULT_KINDS, AUDIO_LANGUAGES, SEASONALS } from "@/constants"
import { db, schema } from "@/drizzle"
import { contentColumns, seasonColumns } from "@/drizzle/table-columns"
import { lastPageOf, toPagination, withPagination } from "@/drizzle/utils"

import { audiosOf, escapeLike, releasedRange } from "../utils"
import { browseValidator, type BrowseValidator } from "../validator.zod"

/**
 * Lists seasons (each with its content) for the browse page: filtered, sorted, and paginated.
 *
 * One row is one season, because posters, status, and release dates belong to seasons. Not cached: every
 * filter combination would be its own cache entry, and the query is cheap for a home catalogue.
 *
 * @param input - Browse filters, validated with `browseValidator`
 * @returns `{ ok: true, data: Pagination<…> }`, or `{ ok: false, errors }` for invalid input. A page past the
 * end is clamped to the last page.
 */
export async function readBrowse(input: unknown) {
  const parsed = browseValidator.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
  }

  const { page, take } = parsed.data
  const where = and(...browseFilters(parsed.data))
  const orderBy = browseOrder(parsed.data)

  const readPage = (pageNo: number) =>
    withPagination(
      db
        .select({
          season: pick(seasonColumns, [
            "id",
            "kind",
            "seasonNo",
            "title",
            "status",
            "releasedOn"
          ]),
          content: pick(contentColumns, [
            "id",
            "slug",
            "kind",
            "title",
            "altTitles",
            "source",
            "genres"
          ]),
          sources: schema.seasons.sources
        })
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

  /**
   * `sources` holds file paths, so only each audio's language and dub flag leave this action.
   */
  const data = pageRows.map(({ sources, ...row }) => ({
    ...row,
    audios: audiosOf(sources)
  }))

  return { ok: true as const, data: toPagination(data, total, currentPage, take) }
}

export type BrowseItem = Extract<
  Awaited<ReturnType<typeof readBrowse>>,
  { ok: true }
>["data"]["data"][number]

/**
 * Builds the `where` conditions; filters that aren't set add nothing.
 */
function browseFilters({
  kind,
  source,
  genres,
  seasonal,
  year,
  status,
  audio,
  search
}: BrowseValidator) {
  const filters: SQL[] = []

  if (kind) {
    filters.push(eq(schema.contents.kind, kind))
  } else {
    filters.push(notInArray(schema.contents.kind, ADULT_KINDS))
  }

  if (source) filters.push(eq(schema.contents.source, source))
  if (genres.length) filters.push(arrayContains(schema.contents.genres, genres))
  if (status) filters.push(eq(schema.seasons.status, status))

  if (year) {
    const [from, to] = releasedRange(year, seasonal)
    filters.push(gte(schema.seasons.releasedOn, from), lt(schema.seasons.releasedOn, to))
  } else if (seasonal) {
    filters.push(
      sql`extract(quarter from ${schema.seasons.releasedOn}) = ${SEASONALS.indexOf(seasonal) + 1}`
    )
  }

  if (audio) {
    const source = { language: AUDIO_LANGUAGES[audio] }
    filters.push(sql`${schema.seasons.sources} @> ${JSON.stringify([source])}::jsonb`)
  }

  if (search) {
    /**
     * `ilike` catches exact substrings (also queries under 3 characters, which have too few trigrams to be
     * similar to anything); `<%` catches typos. Both are served by the trigram indexes.
     */
    const pattern = `%${escapeLike(search)}%`
    const searches = or(
      ilike(schema.contents.searchText, pattern),
      ilike(schema.seasons.title, pattern),
      sql`${search} <% ${schema.contents.searchText}`,
      sql`${search} <% ${schema.seasons.title}`
    )
    if (searches) filters.push(searches)
  }

  return filters
}

/**
 * Builds the `order by`. `releasedOn` sorts `nulls last` to match `seasons_released_on_index` (the column is
 * required, so it never is null), and `seasons.id` breaks ties so offset pagination never repeats or skips a row.
 *
 * `relevance` (best match first, `order` ignored) is the default while searching; without a search it falls
 * back to `released`.
 */
function browseOrder({ sort, order, search }: BrowseValidator) {
  const direction = order === "asc" ? asc : desc
  const sortBy = sort ?? (search ? "relevance" : "released")

  if (sortBy === "relevance" && search) {
    return [
      sql`greatest(word_similarity(${search}, ${schema.contents.searchText}), word_similarity(${search}, coalesce(${schema.seasons.title}, ''))) desc`,
      sql`${schema.seasons.releasedOn} desc nulls last`,
      asc(schema.seasons.id)
    ]
  }

  if (sortBy === "title") {
    return [
      direction(schema.contents.title),
      asc(schema.seasons.releasedOn),
      asc(schema.seasons.id)
    ]
  }

  return [
    order === "asc"
      ? sql`${schema.seasons.releasedOn} asc nulls last`
      : sql`${schema.seasons.releasedOn} desc nulls last`,
    asc(schema.contents.title),
    asc(schema.seasons.id)
  ]
}
