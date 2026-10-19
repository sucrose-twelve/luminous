CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"role" varchar(10) DEFAULT 'user' NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"audio_language" varchar(10),
	"autoplay_next" boolean DEFAULT true NOT NULL,
	"auto_skip" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"display_name" varchar(100) DEFAULT 'display name' NOT NULL,
	"avatar" text DEFAULT 'default-avatar.webp' NOT NULL,
	"bio" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "watch_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"track_id" uuid,
	"position_seconds" integer DEFAULT 0 NOT NULL,
	"duration_seconds" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"watched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "watch_histories_position_check" CHECK ("position_seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "watch_histories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'plan_to_watch' NOT NULL,
	"rating" smallint,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "watchlists_rating_check" CHECK ("rating" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "watchlists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" varchar(255) NOT NULL,
	"kind" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"alternative_titles" jsonb DEFAULT '{}' NOT NULL,
	"synopsis" text,
	"source" varchar(20),
	"genres" varchar(50)[] DEFAULT '{}'::varchar(50)[] NOT NULL,
	"released_on" date,
	"search_text" text GENERATED ALWAYS AS ("contents"."title" || ' ' || coalesce("contents"."alternative_titles" ->> 'EN', '') || ' ' || coalesce("contents"."alternative_titles" ->> 'JP', '') || ' ' || coalesce("contents"."alternative_titles" ->> 'TH', '')) STORED NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "contents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"season_id" uuid NOT NULL,
	"episode_no" integer NOT NULL,
	"kind" varchar(20) DEFAULT 'regular' NOT NULL,
	"title" varchar(255),
	"synopsis" text,
	"thumbnail_path" text,
	"sprite_sheet_path" text,
	"sprite_sheet_grid" jsonb,
	"skips" jsonb DEFAULT '[]' NOT NULL,
	"aired_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "episodes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"content_id" uuid NOT NULL,
	"kind" varchar(20) DEFAULT 'season' NOT NULL,
	"season_no" integer,
	"title" varchar(255),
	"synopsis" text,
	"status" varchar(20) DEFAULT 'finished' NOT NULL,
	"sources" jsonb NOT NULL,
	"poster_path" text NOT NULL,
	"released_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "seasons_season_no_check" CHECK (("kind" <> 'season' or "season_no" is not null) and ("kind" <> 'movie' or "season_no" is null))
);
--> statement-breakpoint
ALTER TABLE "seasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"episode_id" uuid NOT NULL,
	"language" varchar(10) NOT NULL,
	"is_dubbed" boolean DEFAULT false NOT NULL,
	"path" text NOT NULL,
	"mime_codec" varchar(100) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"duration_seconds" integer NOT NULL,
	"width" integer,
	"height" integer,
	"init_end" integer NOT NULL,
	"fragments" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tracks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "account_username_index" ON "accounts" ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "account_email_index" ON "accounts" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "preference_account_index" ON "preferences" ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_account_index" ON "profiles" ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watch_histories_account_content_index" ON "watch_histories" ("account_id","content_id");--> statement-breakpoint
CREATE INDEX "watch_histories_account_watched_at_index" ON "watch_histories" ("account_id","watched_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "watch_histories_content_index" ON "watch_histories" ("content_id");--> statement-breakpoint
CREATE INDEX "watch_histories_episode_index" ON "watch_histories" ("episode_id");--> statement-breakpoint
CREATE INDEX "watch_histories_track_index" ON "watch_histories" ("track_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlists_account_content_index" ON "watchlists" ("account_id","content_id");--> statement-breakpoint
CREATE INDEX "watchlists_content_index" ON "watchlists" ("content_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contents_slug_index" ON "contents" ("slug");--> statement-breakpoint
CREATE INDEX "contents_genres_index" ON "contents" USING gin ("genres");--> statement-breakpoint
CREATE INDEX "contents_search_text_index" ON "contents" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_season_episode_no_index" ON "episodes" ("season_id","episode_no");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_content_season_no_index" ON "seasons" ("content_id","season_no") WHERE "kind" = 'season';--> statement-breakpoint
CREATE INDEX "seasons_content_released_on_index" ON "seasons" ("content_id","released_on");--> statement-breakpoint
CREATE INDEX "seasons_released_on_index" ON "seasons" ("released_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "seasons_title_index" ON "seasons" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_episode_language_index" ON "tracks" ("episode_id","language");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_path_index" ON "tracks" ("path");--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "watch_histories" ADD CONSTRAINT "watch_histories_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "watch_histories" ADD CONSTRAINT "watch_histories_content_id_contents_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "watch_histories" ADD CONSTRAINT "watch_histories_episode_id_episodes_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "watch_histories" ADD CONSTRAINT "watch_histories_track_id_tracks_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_content_id_contents_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_seasons_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_content_id_contents_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_episode_id_episodes_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE;