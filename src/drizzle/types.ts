import type { InferInsertModel, InferSelectModel } from "drizzle-orm"

import type { accounts, preferences, profiles } from "./schema/accounts.schema"
import type { watchHistories, watchlists } from "./schema/activities.schema"
import type { contents, episodes, seasons, tracks } from "./schema/contents.schema"

export type Account = InferSelectModel<typeof accounts>
export type AccountInsertValues = InferInsertModel<typeof accounts>
export type AccountUpdateValues = Partial<AccountInsertValues>

export type Profile = InferSelectModel<typeof profiles>
export type ProfileInsertValues = InferInsertModel<typeof profiles>
export type ProfileUpdateValues = Partial<ProfileInsertValues>

export type Preference = InferSelectModel<typeof preferences>
export type PreferenceInsertValues = InferInsertModel<typeof preferences>
export type PreferenceUpdateValues = Partial<PreferenceInsertValues>

export type Content = InferSelectModel<typeof contents>
export type ContentInsertValues = InferInsertModel<typeof contents>
export type ContentUpdateValues = Partial<ContentInsertValues>

export type Season = InferSelectModel<typeof seasons>
export type SeasonInsertValues = InferInsertModel<typeof seasons>
export type SeasonUpdateValues = Partial<SeasonInsertValues>

export type Episode = InferSelectModel<typeof episodes>
export type EpisodeInsertValues = InferInsertModel<typeof episodes>
export type EpisodeUpdateValues = Partial<EpisodeInsertValues>

export type Track = InferSelectModel<typeof tracks>
export type TrackInsertValues = InferInsertModel<typeof tracks>
export type TrackUpdateValues = Partial<TrackInsertValues>

export type WatchHistory = InferSelectModel<typeof watchHistories>
export type WatchHistoryInsertValues = InferInsertModel<typeof watchHistories>
export type WatchHistoryUpdateValues = Partial<WatchHistoryInsertValues>

export type Watchlist = InferSelectModel<typeof watchlists>
export type WatchlistInsertValues = InferInsertModel<typeof watchlists>
export type WatchlistUpdateValues = Partial<WatchlistInsertValues>
