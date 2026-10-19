import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral
} from "nuqs/server"

import { KINDS, SEASON_STATUSES, SEASONALS, SOURCES } from "@/constants"
import { GENRES } from "@/constants/data/genres"

import { AUDIOS, ORDERS, PAGE_SIZES, SORTS } from "./validator.zod"

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
