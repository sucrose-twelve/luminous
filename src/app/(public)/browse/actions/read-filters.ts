import { count, eq, isNotNull, sql } from "drizzle-orm"
import { groupBy, sumBy } from "es-toolkit"
import { cacheLife, cacheTag } from "next/cache"

import {
  AUDIO_LANGUAGES,
  AUDIOS,
  KINDS,
  ORDERS,
  PAGE_SIZES,
  SEASON_STATUSES,
  SEASONALS,
  SORTS,
  SOURCES
} from "@/constants"
import { genres } from "@/constants/data/genres"
import type { Locales } from "@/constants/enum"
import { db, schema } from "@/drizzle"

import { withCounts } from "../utils"

/**
 * Loads every option the browse filters can offer, each with the number of seasons it matches.
 *
 * Counts are across the whole catalogue, not the current filters, so the result takes no arguments and is
 * cached as one entry. The UI uses `count` to hide or disable empty options. Anything that imports or edits
 * contents or seasons must invalidate the tags below.
 *
 * Audio counts come from `seasons.sources`, which lists each language once per season, so a season counts
 * for its languages even before its tracks are imported.
 */
export async function readBrowseFilters() {
  "use cache"
  cacheTag("contents/list", "seasons/list")
  cacheLife("hours")

  const year = sql<number>`extract(year from ${schema.seasons.releasedOn})::int`
  const quarter = sql<number>`extract(quarter from ${schema.seasons.releasedOn})::int`
  const seasonGenres = db
    .select({ slug: sql<string>`unnest(${schema.contents.genres})`.as("slug") })
    .from(schema.seasons)
    .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
    .as("season_genres")
  const seasonAudios = db
    .select({
      source:
        sql<Content.SeasonSource>`jsonb_array_elements(${schema.seasons.sources})`.as(
          "source"
        )
    })
    .from(schema.seasons)
    .as("season_audios")
  const audioLanguage = sql<Locales>`${seasonAudios.source} ->> 'language'`

  const [
    kindCounts,
    sourceCounts,
    genreCounts,
    statusCounts,
    releasedCounts,
    languageCounts
  ] = await Promise.all([
    db
      .select({ value: schema.contents.kind, count: count() })
      .from(schema.seasons)
      .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
      .groupBy(schema.contents.kind),
    db
      .select({ value: schema.contents.source, count: count() })
      .from(schema.seasons)
      .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
      .groupBy(schema.contents.source),
    db
      .select({ value: seasonGenres.slug, count: count() })
      .from(seasonGenres)
      .groupBy(seasonGenres.slug),
    db
      .select({ value: schema.seasons.status, count: count() })
      .from(schema.seasons)
      .groupBy(schema.seasons.status),
    db
      .select({ year, quarter, count: count() })
      .from(schema.seasons)
      .where(isNotNull(schema.seasons.releasedOn))
      .groupBy(year, quarter),
    db
      .select({
        value: audioLanguage,
        count: count(),
        originals: sql<number>`(count(*) filter (where not (${seasonAudios.source} ->> 'isDubbed')::boolean))::int`
      })
      .from(seasonAudios)
      .groupBy(audioLanguage)
  ])

  const seasonalCounts = (rows: typeof releasedCounts) =>
    SEASONALS.map((value, index) => ({
      value,
      count: sumBy(
        rows.filter((row) => row.quarter === index + 1),
        (row) => row.count
      )
    }))

  const years = Object.values(groupBy(releasedCounts, (row) => row.year))
    .map((rows) => ({
      value: rows[0].year,
      count: sumBy(rows, (row) => row.count),
      seasonals: seasonalCounts(rows)
    }))
    .toSorted((a, b) => b.value - a.value)

  const languages = new Map(languageCounts.map((row) => [row.value, row.count]))
  const genreCountOf = new Map(genreCounts.map((row) => [row.value, row.count]))

  return {
    kinds: withCounts(KINDS, kindCounts),
    sources: withCounts(SOURCES, sourceCounts),
    genres: genres.map(({ slug, text }) => ({
      value: slug,
      text,
      count: genreCountOf.get(slug) ?? 0
    })),
    statuses: withCounts(SEASON_STATUSES, statusCounts),
    seasonals: seasonalCounts(releasedCounts),
    years,
    audios: AUDIOS.map((value) => ({
      value,
      locale: AUDIO_LANGUAGES[value],
      count: languages.get(AUDIO_LANGUAGES[value]) ?? 0
    })),
    sorts: SORTS,
    orders: ORDERS,
    pageSizes: PAGE_SIZES
  }
}

export type BrowseFilters = Awaited<ReturnType<typeof readBrowseFilters>>
