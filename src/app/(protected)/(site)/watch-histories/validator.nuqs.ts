import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsStringLiteral
} from "nuqs/server"

import {
  HISTORY_KINDS,
  HISTORY_SORTS,
  HISTORY_STATUSES,
  HISTORY_VIEWS
} from "./validator.zod"

/**
 * Search param parsers, shared by the server cache below and the client controls (`useHistoryQuery`) so both
 * ends read the URL the same way.
 */
export const historyParsers = {
  page: parseAsInteger.withDefault(1),
  kind: parseAsStringLiteral(HISTORY_KINDS),
  status: parseAsStringLiteral(HISTORY_STATUSES),
  sort: parseAsStringLiteral(HISTORY_SORTS).withDefault("recent"),
  view: parseAsStringLiteral(HISTORY_VIEWS).withDefault("grid")
}

export const queryValidator = createSearchParamsCache(historyParsers)

export type QueryValidator = Awaited<ReturnType<typeof queryValidator.parse>>
