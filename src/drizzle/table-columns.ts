import { getColumns } from "drizzle-orm"

import { accounts, preferences, profiles } from "./schema/accounts.schema"
import { watchHistories, watchlists } from "./schema/activities.schema"
import { contents, episodes, seasons, tracks } from "./schema/contents.schema"

export const accountColumns = getColumns(accounts)
export const profileColumns = getColumns(profiles)
export const preferenceColumns = getColumns(preferences)

export const contentColumns = getColumns(contents)
export const seasonColumns = getColumns(seasons)
export const episodeColumns = getColumns(episodes)
export const trackColumns = getColumns(tracks)

export const watchHistoryColumns = getColumns(watchHistories)
export const watchlistColumns = getColumns(watchlists)
