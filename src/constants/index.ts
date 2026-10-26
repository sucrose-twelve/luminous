export * from "./browse"
export * from "./content"
export * from "./watch-history"

export const APP_VERSION = "v0.1-beta"

export const APP_TOKEN = "__app_auth_token"
export const APP_LOCALE = "__app_locale"
export const APP_THEME = "__app_theme"

export const ROLES = ["root", "admin", "user"] as const satisfies readonly Account.Role[]

export const TOKEN = {
  PREFIX: "luminous",
  /**
   * Token lifetime in days: `keepLoggedIn` gets the long one.
   */
  LIFETIME_DAYS: { short: 1, long: 365 } as const
}
