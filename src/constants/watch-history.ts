/**
 * Kind tabs that `All` covers.
 */
export const HISTORY_GENERAL_KINDS = ["anime", "movie", "series"] as const

/**
 * Kind tabs for `ADULT_KINDS`: shown after a divider, and never part of `All`.
 */
export const HISTORY_ADULT_KINDS = ["anime_ecchi", "movie_adult"] as const

/**
 * Kind tabs for the URL; each one matches one or more `contents.kind` (see `HISTORY_KIND_FILTERS`).
 */
export const HISTORY_KINDS = [...HISTORY_GENERAL_KINDS, ...HISTORY_ADULT_KINDS] as const

export type HistoryKind = (typeof HISTORY_KINDS)[number]

/**
 * The `contents.kind` values each kind tab matches.
 */
export const HISTORY_KIND_FILTERS: Record<HistoryKind, Content.Kind[]> = {
  anime: ["anime_series"],
  movie: ["movie"],
  series: ["tv_series", "series", "shows"],
  anime_ecchi: ["anime_ecchi"],
  movie_adult: ["movie_adult"]
}

export const HISTORY_KIND_LABELS: Record<HistoryKind, string> = {
  anime: "Anime",
  movie: "Movie",
  series: "Series",
  anime_ecchi: "Anime Ecchi",
  movie_adult: "Movie Adult"
}

/**
 * The statuses the page derives from a history row: `completed` is the whole content, not one episode.
 */
export const HISTORY_STATUSES = [
  "watching",
  "completed",
  "on_hold"
] as const satisfies readonly Content.WatchStatus[]

export type HistoryStatus = (typeof HISTORY_STATUSES)[number]

/**
 * The status tabs' labels; the cards' chips use the longer `HISTORY_STATUS_CHIPS`.
 */
export const HISTORY_STATUS_LABELS: Record<HistoryStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  on_hold: "On Hold"
}

export const HISTORY_STATUS_CHIPS: Record<HistoryStatus, string> = {
  watching: "Currently Watching",
  completed: "Completed",
  on_hold: "On Hold"
}

/**
 * Days without watching after which an unfinished content counts as on hold.
 */
export const ON_HOLD_AFTER_DAYS = 30

export const HISTORY_SORTS = ["recent", "oldest", "title"] as const

export type HistorySort = (typeof HISTORY_SORTS)[number]

export const HISTORY_SORT_LABELS: Record<HistorySort, string> = {
  recent: "Recently Watched",
  oldest: "Oldest Watched",
  title: "Title A–Z"
}

export const HISTORY_VIEWS = ["grid", "list"] as const

export type HistoryView = (typeof HISTORY_VIEWS)[number]

export const HISTORY_VIEW_LABELS: Record<HistoryView, string> = {
  grid: "Grid view",
  list: "List view"
}

export const HISTORY_PAGE_SIZE = 24
