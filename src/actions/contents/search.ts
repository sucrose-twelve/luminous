/**
 * Title search over seasons and their contents, shared by `/browse` and the control panel's `/ctrl/seasons` so
 * both match the same way. No `"use server"`: these build SQL, they aren't endpoints.
 */
import { ilike, or, sql } from "drizzle-orm"

import { schema } from "@/drizzle"

/**
 * Escapes `%`, `_`, and `\` so user input is matched literally inside an `ilike` pattern.
 */
export function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, "\\$&")
}

/**
 * Matches a season by its content's titles (`contents.searchText`, alternative titles included) or its own
 * title. The query must join `contents` to `seasons`.
 *
 * `ilike` catches exact substrings (also queries under 3 characters, which have too few trigrams to be similar
 * to anything); `<%` catches typos. Both are served by the trigram indexes.
 */
export function seasonSearch(search: string) {
  const pattern = `%${escapeLike(search)}%`

  return or(
    ilike(schema.contents.searchText, pattern),
    ilike(schema.seasons.title, pattern),
    sql`${search} <% ${schema.contents.searchText}`,
    sql`${search} <% ${schema.seasons.title}`
  )
}

/**
 * Orders `seasonSearch` matches best first: the closer of the content's titles and the season's title.
 */
export function seasonSearchRank(search: string) {
  return sql`greatest(word_similarity(${search}, ${schema.contents.searchText}), word_similarity(${search}, coalesce(${schema.seasons.title}, ''))) desc`
}
