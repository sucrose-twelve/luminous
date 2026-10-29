import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral
} from "nuqs/server"

import { CONTROL_PAGE_SIZES, ORDERS } from "@/constants"

/**
 * The URL state every control panel table shares. Each route spreads these into its own parsers and narrows
 * `sort` (and its default) to its columns.
 */
export const tableParsers = {
  page: parseAsInteger.withDefault(1),
  take: parseAsNumberLiteral(CONTROL_PAGE_SIZES).withDefault(CONTROL_PAGE_SIZES[0]),
  sort: parseAsString,
  order: parseAsStringLiteral(ORDERS)
}

/**
 * Every filter a control panel page may put in the URL, for the shared controls (`useControlQuery`), which
 * only write them: each page reads them back with its own narrowed parsers. A single-choice filter is written
 * as a one-item list, which serializes the same as a plain value.
 */
export const filterParsers = {
  kind: parseAsArrayOf(parseAsString),
  source: parseAsArrayOf(parseAsString),
  genres: parseAsArrayOf(parseAsString),
  status: parseAsArrayOf(parseAsString),
  audio: parseAsArrayOf(parseAsString),
  seasonal: parseAsArrayOf(parseAsString),
  search: parseAsString
}
