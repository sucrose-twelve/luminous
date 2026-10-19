export const APP_VERSION = "v0.1-beta"

export const APP_TOKEN = "__app_auth_token"
export const APP_LOCALE = "__app_locale"
export const APP_THEME = "__app_theme"

export const ROLES = ["root", "admin", "user"] as const satisfies readonly Account.Role[]

export const KINDS = [
  "movie",
  "anime_series",
  "tv_series",
  "series",
  "shows"
] as const satisfies readonly Content.Kind[]

export const SOURCES = [
  "light_novel",
  "manga",
  "web_manga",
  "original",
  "4_koma_manga",
  "game",
  "mixed_media",
  "novel",
  "other",
  "visual_novel",
  "web_novel"
] as const satisfies readonly Content.Source[]

export const SEASON_KINDS = [
  "season",
  "movie",
  "special",
  "spinoff"
] as const satisfies readonly Content.SeasonKind[]

export const SEASON_STATUSES = [
  "upcoming",
  "airing",
  "finished",
  "hiatus",
  "cancelled"
] as const satisfies readonly Content.SeasonStatus[]

/**
 * Anime seasons by release month: winter = Jan–Mar, spring = Apr–Jun, summer = Jul–Sep, fall = Oct–Dec.
 */
export const SEASONALS = ["winter", "spring", "summer", "fall"] as const

export type Seasonal = (typeof SEASONALS)[number]

export const TOKEN = {
  PREFIX: "luminous",
  /**
   * Token lifetime in days: `keepLoggedIn` gets the long one.
   */
  LIFETIME_DAYS: { short: 1, long: 365 } as const
}
