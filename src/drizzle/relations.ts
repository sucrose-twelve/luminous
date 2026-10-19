import { defineRelations } from "drizzle-orm"

import * as accounts from "./schema/accounts.schema"
import * as activities from "./schema/activities.schema"
import * as contents from "./schema/contents.schema"

export const schema = Object.freeze({ ...accounts, ...contents, ...activities })

export const relations = defineRelations(schema, (r) => ({
  accounts: {
    profile: r.one.profiles({ from: r.accounts.id, to: r.profiles.accountId }),
    preference: r.one.preferences({ from: r.accounts.id, to: r.preferences.accountId }),
    watchHistories: r.many.watchHistories(),
    watchlists: r.many.watchlists()
  },
  contents: {
    seasons: r.many.seasons()
  },
  seasons: {
    content: r.one.contents({
      from: r.seasons.contentId,
      to: r.contents.id,
      optional: false
    }),
    episodes: r.many.episodes()
  },
  episodes: {
    season: r.one.seasons({
      from: r.episodes.seasonId,
      to: r.seasons.id,
      optional: false
    }),
    tracks: r.many.tracks()
  },
  tracks: {
    episode: r.one.episodes({
      from: r.tracks.episodeId,
      to: r.episodes.id,
      optional: false
    })
  },
  watchHistories: {
    account: r.one.accounts({
      from: r.watchHistories.accountId,
      to: r.accounts.id,
      optional: false
    }),
    content: r.one.contents({
      from: r.watchHistories.contentId,
      to: r.contents.id,
      optional: false
    }),
    episode: r.one.episodes({
      from: r.watchHistories.episodeId,
      to: r.episodes.id,
      optional: false
    })
  },
  watchlists: {
    account: r.one.accounts({
      from: r.watchlists.accountId,
      to: r.accounts.id,
      optional: false
    }),
    content: r.one.contents({
      from: r.watchlists.contentId,
      to: r.contents.id,
      optional: false
    })
  }
}))
