import { createSearchParamsCache, parseAsString, parseAsTimestamp } from "nuqs/server"

export const searchValidator = createSearchParamsCache({
  msg: parseAsString.withDefault(""),
  ts: parseAsTimestamp.withDefault(new Date())
})

export type SearchValidator = Awaited<ReturnType<typeof searchValidator.parse>>
