import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral
} from "nuqs/server"

import { tableParsers } from "@/app/(controls)/validator.nuqs"
import {
  AUDIOS,
  KINDS,
  ORDERS,
  SEASON_STATUSES,
  SEASON_TABLE_SORTS,
  SEASONALS,
  SOURCES
} from "@/constants"
import { GENRES } from "@/constants/data/genres"

/**
 * The seasons list's filters panel: `/browse`'s filters without the release year, each taking several values.
 * Shared by the server cache below and the panel so both read the URL the same way.
 */
export const seasonListFilterParsers = {
  kind: parseAsArrayOf(parseAsStringLiteral(KINDS)).withDefault(["anime_series"]),
  source: parseAsArrayOf(parseAsStringLiteral(SOURCES)).withDefault([]),
  genres: parseAsArrayOf(parseAsStringLiteral(GENRES)).withDefault([]),
  status: parseAsArrayOf(parseAsStringLiteral(SEASON_STATUSES)).withDefault([]),
  audio: parseAsArrayOf(parseAsStringLiteral(AUDIOS)).withDefault([]),
  seasonal: parseAsArrayOf(parseAsStringLiteral(SEASONALS)).withDefault([])
}

/**
 * No `sort` means relevance while searching (the header's search lands here), otherwise newest first.
 */
export const queryValidator = createSearchParamsCache({
  ...tableParsers,
  ...seasonListFilterParsers,
  search: parseAsString,
  sort: parseAsStringLiteral(SEASON_TABLE_SORTS),
  order: parseAsStringLiteral(ORDERS).withDefault("desc")
})

export type QueryValidator = Awaited<ReturnType<typeof queryValidator.parse>>
