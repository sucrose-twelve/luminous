/**
 * Where staff land: the control panel's first tab. `/ctrl` itself redirects here.
 */
export const CONTROL_HOME = "/ctrl/contents"

/**
 * Rows per page for every control panel table.
 */
export const CONTROL_PAGE_SIZES = [25, 50, 100] as const

export type ControlPageSize = (typeof CONTROL_PAGE_SIZES)[number]

export const ACCOUNT_SORTS = ["username", "displayName", "role", "joined"] as const

export type AccountSort = (typeof ACCOUNT_SORTS)[number]

export const CONTENT_SORTS = ["title", "kind", "source", "seasons", "updated"] as const

export type ContentSort = (typeof CONTENT_SORTS)[number]

/**
 * The seasons table's columns, shared by a content's page and `/ctrl/seasons`.
 */
export const SEASON_TABLE_SORTS = [
  "title",
  "kind",
  "status",
  "episodes",
  "released"
] as const

export type SeasonTableSort = (typeof SEASON_TABLE_SORTS)[number]

export const EPISODE_TABLE_SORTS = ["number", "kind", "duration", "aired"] as const

export type EpisodeTableSort = (typeof EPISODE_TABLE_SORTS)[number]
