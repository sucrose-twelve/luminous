import { addMonths, format } from "date-fns"
import { pick } from "es-toolkit"

import { SEASONALS, type Seasonal } from "@/constants"

import { type AUDIOS, type ORDERS, type SORTS } from "./validator.zod"

/**
 * Pairs every known option with its count from a `group by` query, `0` when the query has no row for it.
 *
 * @param values - All options in display order, e.g. `KINDS`
 * @param rows - `{ value, count }` rows from the query; rows for unknown values (e.g. `null`) are ignored
 */
export function withCounts<T extends string>(
  values: readonly T[],
  rows: readonly { value: T | null; count: number }[]
) {
  const counts = new Map(rows.map((row) => [row.value, row.count]))
  return values.map((value) => ({ value, count: counts.get(value) ?? 0 }))
}

/**
 * Turns a year, optionally narrowed to an anime season, into a half-open `[from, to)` range of `released_on`
 * dates.
 *
 * @example
 * ```ts
 * releasedRange(2025) // ["2025-01-01", "2026-01-01"]
 * releasedRange(2025, "fall") // ["2025-10-01", "2026-01-01"]
 * ```
 */
export function releasedRange(
  year: number,
  seasonal?: Seasonal | null
): [string, string] {
  const from = new Date(year, seasonal ? SEASONALS.indexOf(seasonal) * 3 : 0, 1)
  const to = addMonths(from, seasonal ? 3 : 12)

  return [format(from, "yyyy-MM-dd"), format(to, "yyyy-MM-dd")]
}

/**
 * Strips a season's `sources` down to the audios it offers, without `pathname`, the original audio first.
 */
export function audiosOf(sources: readonly Content.SeasonSource[]) {
  return sources
    .map((source) => pick(source, ["language", "isDubbed"]))
    .toSorted(
      (a, b) =>
        Number(a.isDubbed) - Number(b.isDubbed) || a.language.localeCompare(b.language)
    )
}

/**
 * Escapes `%`, `_`, and `\` so user input is matched literally inside an `ilike` pattern.
 */
export function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, "\\$&")
}

export const AUDIO_LABELS: Record<(typeof AUDIOS)[number], string> = {
  ja: "Japanese",
  en: "English",
  th: "Thai",
  ko: "Korean",
  zh: "Chinese"
}

/**
 * The sort dropdown's options: each one is a `sort` + `order` pair in the URL. `relevance` is left out: it
 * only applies while searching, and the page has no search box yet.
 */
export const SORT_OPTIONS = [
  { id: "newest", label: "Newest", sort: "released", order: "desc" },
  { id: "oldest", label: "Oldest", sort: "released", order: "asc" },
  { id: "title-asc", label: "Title A-Z", sort: "title", order: "asc" },
  { id: "title-desc", label: "Title Z-A", sort: "title", order: "desc" }
] as const satisfies readonly {
  id: string
  label: string
  sort: (typeof SORTS)[number]
  order: (typeof ORDERS)[number]
}[]

export type SortOption = (typeof SORT_OPTIONS)[number]

/**
 * Finds the sort option the URL currently describes; no `sort` reads as `released` (the reader's default).
 */
export function sortOptionOf({
  sort,
  order
}: Readonly<{ sort: (typeof SORTS)[number] | null; order: (typeof ORDERS)[number] }>) {
  const sortBy = sort ?? "released"
  return (
    SORT_OPTIONS.find((option) => option.sort === sortBy && option.order === order) ??
    null
  )
}
