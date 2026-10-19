import { genres } from "@/constants/data/genres"
import { seasonName } from "@/libs/season"

/**
 * Content kinds spelled out for the hero's meta row; the browse cards use the short `KIND_LABELS`.
 */
export const KIND_FULL_LABELS: Record<Content.Kind, string> = {
  movie: "Movie",
  anime_series: "Anime Series",
  tv_series: "TV Series",
  series: "Series",
  shows: "Shows"
}

export const SEASON_KIND_LABELS: Record<Content.SeasonKind, string> = {
  season: "Season",
  movie: "The Movie",
  special: "Special",
  spinoff: "Spinoff"
}

/**
 * Chip colors of the sidebar cards, by season kind.
 */
export const SEASON_KIND_CHIP_CLASSES: Record<Content.SeasonKind, string> = {
  season: "bg-theme-500 text-theme-950",
  movie: "bg-blue-500 text-blue-50",
  special: "bg-orange-500 text-orange-50",
  spinoff: "bg-indigo-500 text-indigo-50"
}

const GENRE_TEXTS = new Map(genres.map((genre) => [genre.slug, genre.text]))

/**
 * A genre's display text, e.g. `Action (ต่อสู้)`; an unknown slug shows as is.
 */
export function genreText(slug: string) {
  return GENRE_TEXTS.get(slug) ?? slug
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
  return season.title ?? `${contentTitle} • ${seasonName(season)}`
}
