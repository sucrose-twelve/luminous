import { genres } from "@/constants/data/genres"

const GENRE_TEXTS = new Map(genres.map((genre) => [genre.slug, genre.text]))

/**
 * A genre's display text, e.g. `Action (ต่อสู้)`; an unknown slug shows as is.
 */
export function genreText(slug: string) {
  return GENRE_TEXTS.get(slug) ?? slug
}
