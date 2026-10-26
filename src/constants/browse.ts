import { Locales } from "./enum"

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

export type Audio = (typeof AUDIOS)[number]

export const AUDIO_LABELS: Record<Audio, string> = {
  ja: "Japanese",
  en: "English",
  th: "Thai",
  ko: "Korean",
  zh: "Chinese"
}

export const SORTS = ["relevance", "released", "title"] as const

export type Sort = (typeof SORTS)[number]

export const ORDERS = ["asc", "desc"] as const

export type Order = (typeof ORDERS)[number]

export const PAGE_SIZES = [24, 48, 96] as const

/**
 * The sort dropdown's options: each one is a `sort` + `order` pair in the URL. `relevance` is left out: it
 * only applies while searching, and the page has no search box yet.
 */
export const SORT_OPTIONS = [
  { id: "newest", label: "Newest", sort: "released", order: "desc" },
  { id: "oldest", label: "Oldest", sort: "released", order: "asc" },
  { id: "title-asc", label: "Title A-Z", sort: "title", order: "asc" },
  { id: "title-desc", label: "Title Z-A", sort: "title", order: "desc" }
] as const satisfies readonly { id: string; label: string; sort: Sort; order: Order }[]

export type SortOption = (typeof SORT_OPTIONS)[number]
