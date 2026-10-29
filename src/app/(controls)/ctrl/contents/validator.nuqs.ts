import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsStringLiteral
} from "nuqs/server"

import { tableParsers } from "@/app/(controls)/validator.nuqs"
import { CONTENT_SORTS, KINDS, ORDERS, SOURCES } from "@/constants"
import { GENRES } from "@/constants/data/genres"

/**
 * The contents table's filters, shared by the server cache below and the filters panel so both read the URL
 * the same way.
 */
export const contentFilterParsers = {
  kind: parseAsArrayOf(parseAsStringLiteral(KINDS)).withDefault(["anime_series"]),
  source: parseAsArrayOf(parseAsStringLiteral(SOURCES)).withDefault([]),
  genres: parseAsArrayOf(parseAsStringLiteral(GENRES)).withDefault([])
}

export const queryValidator = createSearchParamsCache({
  ...tableParsers,
  ...contentFilterParsers,
  sort: parseAsStringLiteral(CONTENT_SORTS).withDefault("title"),
  order: parseAsStringLiteral(ORDERS).withDefault("asc")
})

export type QueryValidator = Awaited<ReturnType<typeof queryValidator.parse>>
