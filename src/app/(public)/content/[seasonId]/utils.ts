import { seasonName } from "@/libs/season"

/**
 * Chip colors of the sidebar cards, by season kind.
 */
export const SEASON_KIND_CHIP_CLASSES: Record<Content.SeasonKind, string> = {
  season: "bg-theme-500 text-theme-950",
  movie: "bg-blue-500 text-blue-50",
  special: "bg-orange-500 text-orange-50",
  spinoff: "bg-indigo-500 text-indigo-50"
}

/**
 * A season's full title: its own title when it has one, otherwise the content title and the season name.
 *
 * @example
 * ```ts
 * seasonTitle("Kanojo Okarishimasu", { kind: "season", seasonNo: 2, title: null })
 * // "Kanojo Okarishimasu Season 2"
 * ```
 */
export function seasonTitle(
  contentTitle: string,
  season: Readonly<{
    kind: Content.SeasonKind
    seasonNo: number | null
    title: string | null
  }>
) {
  return `${contentTitle} • ${season.title ?? seasonName(season)}`
}
