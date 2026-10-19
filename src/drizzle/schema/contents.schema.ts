import { sql, type SQL } from "drizzle-orm"
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core"

import { type Locales } from "@/constants/enum"

import { sharedTimestampColumns } from "../utils"

export const contents = pgTable.withRLS(
  "contents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull(),
    kind: varchar("kind", { length: 20 }).notNull().$type<Content.Kind>(),
    title: varchar("title", { length: 255 }).notNull(),
    altTitles: jsonb("alternative_titles")
      .notNull()
      .default({})
      .$type<Content.AlternativeTitles>(),
    synopsis: text("synopsis"),
    source: varchar("source", { length: 20 }).$type<Content.Source>(),
    genres: varchar("genres", { length: 50 }).array().notNull().default([]),
    /**
     * `title` plus every alternative title, for trigram search: a jsonb column can't take a trigram index.
     * Lists the `Content.AlternativeTitles` keys by hand (a generated column must be immutable, so no
     * `jsonb_each_text`); add a key here when that type gains one.
     */
    searchText: text("search_text")
      .notNull()
      .generatedAlwaysAs(
        (): SQL =>
          sql`${contents.title} || ' ' || coalesce(${contents.altTitles} ->> 'EN', '') || ' ' || coalesce(${contents.altTitles} ->> 'JP', '') || ' ' || coalesce(${contents.altTitles} ->> 'TH', '')`
      ),
    sourceDir: text("source_directory").notNull(),
    ...sharedTimestampColumns
  },
  (self) => [
    uniqueIndex("contents_slug_index").on(self.slug),
    index("contents_genres_index").using("gin", self.genres),
    index("contents_search_text_index").using("gin", self.searchText.op("gin_trgm_ops"))
  ]
)

export const seasons = pgTable.withRLS(
  "seasons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 20 })
      .notNull()
      .default("season")
      .$type<Content.SeasonKind>(),
    /**
     * The `N` of a "Season N" label: required for `season`, absent for `movie`, optional otherwise (a spinoff
     * may count its own seasons). Seasons are ordered by `releasedOn`, not by this.
     */
    seasonNo: integer("season_no"),
    title: varchar("title", { length: 255 }),
    synopsis: text("synopsis"),
    status: varchar("status", { length: 20 })
      .notNull()
      .default("finished")
      .$type<Content.SeasonStatus>(),
    /**
     * Every audio version of the season, at most one of them the original (`isDubbed: false`; a season may have
     * only dubs) and each language once. `tests/track.spec.ts` imports tracks from these paths.
     */
    sources: jsonb("sources").notNull().$type<Content.SeasonSource[]>(),
    poster: text("poster_path").notNull(),
    releasedOn: date("released_on").notNull(),
    ...sharedTimestampColumns
  },
  (self) => [
    uniqueIndex("seasons_content_season_no_index")
      .on(self.contentId, self.seasonNo)
      .where(sql`${self.kind} = 'season'`),
    index("seasons_content_released_on_index").on(self.contentId, self.releasedOn),
    index("seasons_released_on_index").on(self.releasedOn.desc().nullsLast()),
    index("seasons_title_index").using("gin", self.title.op("gin_trgm_ops")),
    check(
      "seasons_season_no_check",
      sql`(${self.kind} <> 'season' or ${self.seasonNo} is not null) and (${self.kind} <> 'movie' or ${self.seasonNo} is null)`
    )
  ]
)

export const episodes = pgTable.withRLS(
  "episodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    episodeNo: integer("episode_no").notNull(),
    kind: varchar("kind", { length: 20 })
      .notNull()
      .default("regular")
      .$type<Content.EpisodeKind>(),
    title: varchar("title", { length: 255 }),
    synopsis: text("synopsis"),
    thumbnail: text("thumbnail_path"),
    /**
     * Hover-preview sprite sheet, shared by every track of the episode. Both columns are set together by
     * the art step of `tests/track.spec.ts`; `null` means no sprite yet.
     */
    sprite: text("sprite_sheet_path"),
    spriteGrid: jsonb("sprite_sheet_grid").$type<Content.SpriteGrid>(),
    skips: jsonb("skips").notNull().default([]).$type<Content.Skip[]>(),
    airedOn: date("aired_on"),
    ...sharedTimestampColumns
  },
  (self) => [
    uniqueIndex("episodes_season_episode_no_index").on(self.seasonId, self.episodeNo)
  ]
)

export const tracks = pgTable.withRLS(
  "tracks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 10 }).notNull().$type<Locales>(),
    isDubbed: boolean("is_dubbed").notNull().default(false),
    path: text("path").notNull(),
    mimeCodec: varchar("mime_codec", { length: 100 }).notNull(),
    size: bigint("size_bytes", { mode: "number" }).notNull(),
    duration: integer("duration_seconds").notNull(),
    width: integer("width"),
    height: integer("height"),
    initEnd: integer("init_end").notNull(),
    fragments: jsonb("fragments").notNull().$type<Content.Fragment[]>(),
    ...sharedTimestampColumns
  },
  (self) => [
    uniqueIndex("tracks_episode_language_index").on(self.episodeId, self.language),
    uniqueIndex("tracks_path_index").on(self.path)
  ]
)
