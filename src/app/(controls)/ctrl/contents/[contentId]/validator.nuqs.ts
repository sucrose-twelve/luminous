import { createSearchParamsCache, parseAsStringLiteral } from "nuqs/server"

import { tableParsers } from "@/app/(controls)/validator.nuqs"
import { ORDERS, SEASON_KINDS, SEASON_STATUSES, SEASON_TABLE_SORTS } from "@/constants"

/**
 * The seasons filters above a content's table: one season kind and one status, or all of them.
 */
export const seasonFilterParsers = {
  kind: parseAsStringLiteral(SEASON_KINDS),
  status: parseAsStringLiteral(SEASON_STATUSES)
}

export const queryValidator = createSearchParamsCache({
  ...tableParsers,
  ...seasonFilterParsers,
  sort: parseAsStringLiteral(SEASON_TABLE_SORTS).withDefault("released"),
  order: parseAsStringLiteral(ORDERS).withDefault("asc")
})

export type QueryValidator = Awaited<ReturnType<typeof queryValidator.parse>>
