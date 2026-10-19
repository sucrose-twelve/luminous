import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core"

import { type Locales } from "@/constants/enum"

import { sharedTimestampColumns } from "../utils"

export const accounts = pgTable.withRLS(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    role: varchar("role", { length: 10 }).notNull().default("user").$type<Account.Role>(),
    username: varchar("username", { length: 50 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    password: text("password").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    isVerified: boolean("is_verified").notNull().default(false),
    isSuspended: boolean("is_suspended").notNull().default(false),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    ...sharedTimestampColumns
  },
  (self) => [
    uniqueIndex("account_username_index").on(self.username),
    uniqueIndex("account_email_index").on(self.email)
  ]
)

export const profiles = pgTable.withRLS(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 100 })
      .notNull()
      .default("display name"),
    avatar: text("avatar").notNull().default("default-avatar.webp"),
    bio: text("bio"),
    notes: text("notes"),
    ...sharedTimestampColumns
  },
  (self) => [uniqueIndex("profile_account_index").on(self.accountId)]
)

export const preferences = pgTable.withRLS(
  "preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    audioLanguage: varchar("audio_language", { length: 10 }).$type<Locales>(), // null → original audio
    autoplayNext: boolean("autoplay_next").notNull().default(true),
    autoSkip: boolean("auto_skip").notNull().default(false),
    ...sharedTimestampColumns
  },
  (self) => [uniqueIndex("preference_account_index").on(self.accountId)]
)
