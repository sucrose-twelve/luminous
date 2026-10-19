import { SEASONALS } from "@/constants"
import { SEASONAL_LABELS } from "@/constants/labels"

/**
 * What an untitled season is called, by kind.
 */
const SEASON_KIND_NAMES: Record<Content.SeasonKind, string> = {
  season: "Season",
  movie: "Movie",
  special: "Specials",
  spinoff: "Spinoff"
}

/**
 * A season's display name: `Season 2` for a numbered season, otherwise its title, or its kind when it has
 * none.
 *
 * @example
 * ```ts
 * seasonName({ kind: "season", seasonNo: 2, title: null }) // "Season 2"
 * seasonName({ kind: "special", seasonNo: null, title: null }) // "Specials"
 * ```
 */
export function seasonName({
  kind,
  seasonNo,
  title
}: Readonly<{
  kind: Content.SeasonKind
  seasonNo: number | null
  title: string | null
}>) {
  if (kind === "season" && seasonNo !== null) return `Season ${seasonNo}`
  return title ?? SEASON_KIND_NAMES[kind]
}

/**
 * When a season aired, as its anime season and year. Months map to seasons the same way as `SEASONALS`
 * (and the browse filter's `extract(quarter …)`).
 *
 * @param releasedOn - `seasons.releasedOn`, a `YYYY-MM-DD` date string (read as written, no time zone)
 *
 * @example
 * ```ts
 * airedLabel("2022-07-02") // "Summer (2022)"
 * ```
 */
export function airedLabel(releasedOn: string) {
  const [year, month] = releasedOn.split("-").map(Number)
  return `${SEASONAL_LABELS[SEASONALS[Math.floor((month - 1) / 3)]]} (${year})`
}
