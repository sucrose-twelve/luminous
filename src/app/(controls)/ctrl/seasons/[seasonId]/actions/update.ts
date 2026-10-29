"use server"

import { eq } from "drizzle-orm"
import { updateTag } from "next/cache"
import { z } from "zod"

import { withRole } from "@/actions/auth"
import { STAFF_ROLES } from "@/constants"
import { db, schema } from "@/drizzle"

/**
 * Expires every cached read of a season, its episodes, and their tracks. Staff only.
 *
 * `tests/track.spec.ts` imports outside the Next.js process, so it can't expire anything itself: without this,
 * the site keeps showing the season as it was before the import until `cacheLife("hours")` runs out.
 *
 * @param seasonId - `seasons.id`
 * @returns How many episodes and tracks were refreshed, or a `message` when there's no such season
 */
export const refreshSeasonCache = withRole(
  STAFF_ROLES,
  async (_account, seasonId: unknown) => {
    const id = z.uuid().safeParse(seasonId)
    if (!id.success) return { ok: false as const, message: "Season not found" }

    const [[season], rows] = await Promise.all([
      db
        .select({ contentId: schema.seasons.contentId })
        .from(schema.seasons)
        .where(eq(schema.seasons.id, id.data))
        .limit(1),
      db
        .select({ episodeId: schema.episodes.id, trackId: schema.tracks.id })
        .from(schema.episodes)
        .leftJoin(schema.tracks, eq(schema.tracks.episodeId, schema.episodes.id))
        .where(eq(schema.episodes.seasonId, id.data))
    ])
    if (!season) return { ok: false as const, message: "Season not found" }

    const episodeIds = new Set(rows.map((row) => row.episodeId))
    const trackIds = rows.flatMap((row) => (row.trackId ? [row.trackId] : []))

    updateTag("seasons/list")
    updateTag(`seasons/${id.data}`)
    updateTag(`seasons/${id.data}/episodes`)
    updateTag(`contents/${season.contentId}/episodes`)
    episodeIds.forEach((episodeId) => updateTag(`episodes/${episodeId}`))
    trackIds.forEach((trackId) => updateTag(`tracks/${trackId}`))

    return { ok: true as const, episodes: episodeIds.size, tracks: trackIds.length }
  }
)
