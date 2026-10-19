import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum
} from "nuqs/server"

import { Locales } from "@/constants/enum"

/**
 * `vid` is the episode (`episodes.id`). `audio` asks for one of its tracks by language; without it, or when
 * the episode has no track in that language, the server falls back to the account's preference, then the
 * original audio.
 */
export const queryValidator = createSearchParamsCache({
  vid: parseAsString,
  audio: parseAsStringEnum<Locales>(Object.values(Locales)),
  t: parseAsInteger
})

export type QueryValidator = Awaited<ReturnType<typeof queryValidator.parse>>
