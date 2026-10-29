import { createSearchParamsCache, parseAsStringLiteral } from "nuqs/server"

import { tableParsers } from "@/app/(controls)/validator.nuqs"
import { AUDIOS, EPISODE_KINDS, EPISODE_TABLE_SORTS, ORDERS } from "@/constants"

export const queryValidator = createSearchParamsCache({
  ...tableParsers,
  kind: parseAsStringLiteral(EPISODE_KINDS),
  audio: parseAsStringLiteral(AUDIOS),
  sort: parseAsStringLiteral(EPISODE_TABLE_SORTS).withDefault("number"),
  order: parseAsStringLiteral(ORDERS).withDefault("asc")
})

export type QueryValidator = Awaited<ReturnType<typeof queryValidator.parse>>
