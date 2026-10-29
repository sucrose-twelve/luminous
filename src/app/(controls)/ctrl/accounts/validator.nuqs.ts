import { createSearchParamsCache, parseAsStringLiteral } from "nuqs/server"

import { tableParsers } from "@/app/(controls)/validator.nuqs"
import { ACCOUNT_SORTS, ORDERS } from "@/constants"

export const accountParsers = {
  ...tableParsers,
  sort: parseAsStringLiteral(ACCOUNT_SORTS).withDefault("joined"),
  order: parseAsStringLiteral(ORDERS).withDefault("desc")
}

export const queryValidator = createSearchParamsCache(accountParsers)

export type QueryValidator = Awaited<ReturnType<typeof queryValidator.parse>>
