/**
 * Cache expiry shared by the control panel's Refresh site cache and its track import. No `"use server"`: a
 * helper, not an endpoint, and `updateTag` only works inside the Server Actions that call it.
 */
import { eq, inArray } from "drizzle-orm"
import { updateTag } from "next/cache"

import { db, schema } from "@/drizzle"

/**
 * Expires every cached read of some seasons, their episodes, and their tracks.
 *
 * `tests/track.spec.ts` imports outside the Next.js process, so it can't expire anything itself: without this,
 * the site keeps showing a season as it was before the import until `cacheLife("hours")` runs out.
 *
 * @param seasonIds - `seasons.id`s; ids with no season are skipped
 * @returns How many seasons, episodes, and tracks were refreshed
 */
export async function expireSeasonCaches(seasonIds: readonly string[]) {
  if (seasonIds.length === 0) return { seasons: 0, episodes: 0, tracks: 0 }

  const [seasons, rows] = await Promise.all([
    db
      .select({ id: schema.seasons.id, contentId: schema.seasons.contentId })
      .from(schema.seasons)
      .where(inArray(schema.seasons.id, seasonIds)),
    db
      .select({ episodeId: schema.episodes.id, trackId: schema.tracks.id })
      .from(schema.episodes)
      .leftJoin(schema.tracks, eq(schema.tracks.episodeId, schema.episodes.id))
      .where(inArray(schema.episodes.seasonId, seasonIds))
  ])
  if (seasons.length === 0) return { seasons: 0, episodes: 0, tracks: 0 }

  const contentIds = new Set(seasons.map((season) => season.contentId))
  const episodeIds = new Set(rows.map((row) => row.episodeId))
  const trackIds = rows.flatMap((row) => (row.trackId ? [row.trackId] : []))

  updateTag("seasons/list")
  seasons.forEach((season) => {
    updateTag(`seasons/${season.id}`)
    updateTag(`seasons/${season.id}/episodes`)
  })
  contentIds.forEach((contentId) => updateTag(`contents/${contentId}/episodes`))
  episodeIds.forEach((episodeId) => updateTag(`episodes/${episodeId}`))
  trackIds.forEach((trackId) => updateTag(`tracks/${trackId}`))

  return { seasons: seasons.length, episodes: episodeIds.size, tracks: trackIds.length }
}
