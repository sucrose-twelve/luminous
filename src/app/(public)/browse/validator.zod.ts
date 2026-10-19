import { z } from "zod"

import { KINDS, SEASON_STATUSES, SEASONALS, SOURCES } from "@/constants"
import { GENRES } from "@/constants/data/genres"
import { Locales } from "@/constants/enum"

/**
 * Short audio codes for the URL, mapped to the `seasons.sources` language they match.
 */
export const AUDIO_LANGUAGES = {
  ja: Locales.JP,
  en: Locales.US,
  th: Locales.TH,
  ko: Locales.KR,
  zh: Locales.CN
} as const

export const AUDIOS = [
  "ja",
  "en",
  "th",
  "ko",
  "zh"
] as const satisfies readonly (keyof typeof AUDIO_LANGUAGES)[]

export const SORTS = ["relevance", "released", "title"] as const

export const ORDERS = ["asc", "desc"] as const

export const PAGE_SIZES = [24, 48, 96] as const

export const browseValidator = z.object({
  page: z.int().min(1).default(1),
  take: z.literal(PAGE_SIZES).default(24),
  kind: z.enum(KINDS).nullish(),
  source: z.enum(SOURCES).nullish(),
  genres: z.array(z.enum(GENRES)).max(10).default([]),
  seasonal: z.enum(SEASONALS).nullish(),
  year: z.int().min(1900).max(2999).nullish(),
  status: z.enum(SEASON_STATUSES).nullish(),
  audio: z.enum(AUDIOS).nullish(),
  search: z.string().trim().max(100).nullish(),
  sort: z.enum(SORTS).nullish(),
  order: z.enum(ORDERS).default("desc")
})

export type BrowseValidator = z.infer<typeof browseValidator>
