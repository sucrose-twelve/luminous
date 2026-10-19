import { eq } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { db, schema } from "@/drizzle"
import { seasonColumns, trackColumns } from "@/drizzle/table-columns"

/**
 * Looks up a track's file, playback manifest, and the season source it was imported from.
 *
 * Cached because every chunk request of a playing episode needs it. Server-only: the result holds file paths,
 * so never pass it to a Client Component.
 *
 * @returns The track with `root`, the `pathname` of the season source in the track's language (`null` when the
 * season no longer lists that language), or `null` when no track has that ID
 */
export async function readTrack(trackId: string) {
  "use cache"
  cacheTag(`tracks/${trackId}`)
  cacheLife("hours")

  const [row] = await db
    .select({
      path: trackColumns.path,
      language: trackColumns.language,
      mimeCodec: trackColumns.mimeCodec,
      duration: trackColumns.duration,
      initEnd: trackColumns.initEnd,
      fragments: trackColumns.fragments,
      sources: seasonColumns.sources
    })
    .from(schema.tracks)
    .innerJoin(schema.episodes, eq(schema.tracks.episodeId, schema.episodes.id))
    .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
    .where(eq(schema.tracks.id, trackId))
    .limit(1)

  if (!row) return null

  const { sources, ...track } = row
  const root =
    sources.find((source) => source.language === track.language)?.pathname ?? null
  return { ...track, root }
}
