ALTER TABLE "watch_histories" DROP CONSTRAINT "watch_histories_track_id_tracks_id_fkey";--> statement-breakpoint
DROP INDEX "watch_histories_track_index";--> statement-breakpoint
ALTER TABLE "watch_histories" DROP COLUMN "track_id";