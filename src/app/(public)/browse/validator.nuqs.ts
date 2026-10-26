import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral
} from "nuqs/server"

import {
  AUDIOS,
  KINDS,
  ORDERS,
  PAGE_SIZES,
  SEASON_STATUSES,
  SEASONALS,
  SORTS,
  SOURCES
} from "@/constants"
import { GENRES } from "@/constants/data/genres"

/**
 * Search param parsers, shared by the server cache below and the client controls (`useBrowseQuery`) so both
 * ends read the URL the same way.
 */
export const browseParsers = {
  page: parseAsInteger.withDefault(1),
  take: parseAsNumberLiteral(PAGE_SIZES).withDefault(24),
  kind: parseAsStringLiteral(KINDS),
  source: parseAsStringLiteral(SOURCES),
  genres: parseAsArrayOf(parseAsStringLiteral(GENRES)).withDefault([]),
  seasonal: parseAsStringLiteral(SEASONALS),
  year: parseAsInteger,
  status: parseAsStringLiteral(SEASON_STATUSES),
  audio: parseAsStringLiteral(AUDIOS),
  search: parseAsString,
  sort: parseAsStringLiteral(SORTS),
  order: parseAsStringLiteral(ORDERS).withDefault("desc")
}

export const queryValidator = createSearchParamsCache(browseParsers)

export type QueryValidator = Awaited<ReturnType<typeof queryValidator.parse>>
