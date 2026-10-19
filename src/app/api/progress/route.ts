import { eq, sql } from "drizzle-orm"
import type { NextRequest } from "next/server"

import { withGuard } from "@/actions/auth"
import { db, schema } from "@/drizzle"

import { progressValidator } from "./validator.zod"

/**
 * From this share of the duration on (end credits), the episode counts as watched.
 */
const COMPLETED_RATIO = 0.9

/**
 * Saves where the account stopped in a content: the player's `navigator.sendBeacon` target. Answers `204`.
 *
 * Keeps one row per account per content, so a new episode overwrites the last. The episode, content, and
 * duration come from the track in the DB, never from the body.
 */
export async function POST(request: NextRequest) {
  const account = await withGuard(request)
  if (!account) return new Response(null, { status: 401 })

  let body: unknown
  try {
    body = JSON.parse(await request.text())
  } catch {
    return new Response(null, { status: 400 })
  }

  const parsed = progressValidator.safeParse(body)
  if (!parsed.success) return new Response(null, { status: 400 })

  const [track] = await db
    .select({
      episodeId: schema.tracks.episodeId,
      contentId: schema.seasons.contentId,
      duration: schema.tracks.duration
    })
    .from(schema.tracks)
    .innerJoin(schema.episodes, eq(schema.tracks.episodeId, schema.episodes.id))
    .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
    .where(eq(schema.tracks.id, parsed.data.trackId))
    .limit(1)
  if (!track) return new Response(null, { status: 404 })

  const positionSeconds = Math.floor(Math.min(parsed.data.position, track.duration))
  const progress = {
    episodeId: track.episodeId,
    positionSeconds,
    durationSeconds: track.duration,
    completedAt: positionSeconds >= track.duration * COMPLETED_RATIO ? sql`now()` : null,
    watchedAt: sql`now()`
  }

  await db
    .insert(schema.watchHistories)
    .values({ accountId: account.id, contentId: track.contentId, ...progress })
    .onConflictDoUpdate({
      target: [schema.watchHistories.accountId, schema.watchHistories.contentId],
      set: { ...progress, updatedAt: sql`now()` }
    })

  return new Response(null, { status: 204 })
}
