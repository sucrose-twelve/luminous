import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core"

import { sharedTimestampColumns } from "../utils"
import { accounts } from "./accounts.schema"
import { contents, episodes } from "./contents.schema"

export const watchHistories = pgTable.withRLS(
  "watch_histories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    positionSeconds: integer("position_seconds").notNull().default(0),
    durationSeconds: integer("duration_seconds").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    watchedAt: timestamp("watched_at", { withTimezone: true }).notNull().defaultNow(),
    ...sharedTimestampColumns
  },
  (self) => [
    uniqueIndex("watch_histories_account_content_index").on(
      self.accountId,
      self.contentId
    ),
    index("watch_histories_account_watched_at_index").on(
      self.accountId,
      self.watchedAt.desc()
    ),
    index("watch_histories_content_index").on(self.contentId),
    index("watch_histories_episode_index").on(self.episodeId),
    check("watch_histories_position_check", sql`${self.positionSeconds} >= 0`)
  ]
)

export const watchlists = pgTable.withRLS(
  "watchlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 })
      .notNull()
      .default("plan_to_watch")
      .$type<Content.WatchStatus>(),
    rating: smallint("rating"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    ...sharedTimestampColumns
  },
  (self) => [
    uniqueIndex("watchlists_account_content_index").on(self.accountId, self.contentId),
    index("watchlists_content_index").on(self.contentId),
    check("watchlists_rating_check", sql`${self.rating} between 1 and 5`)
  ]
)
