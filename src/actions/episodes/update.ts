"use server"

import fs from "node:fs"
import path from "node:path"

import { eq } from "drizzle-orm"
import { pick } from "es-toolkit"
import { updateTag } from "next/cache"
import { z } from "zod"

import { withRole } from "@/actions/auth"
import { SKIP_KINDS, STAFF_ROLES } from "@/constants"
import { db, schema } from "@/drizzle"
import {
  contentColumns,
  episodeColumns,
  seasonColumns,
  trackColumns
} from "@/drizzle/table-columns"
import { hasFfmpeg, writeThumbnail } from "@/libs/ffmpeg"
import { logger } from "@/libs/logger"
import { artTrack, seasonArtDirectory } from "@/libs/media"
import { formatTime } from "@/libs/time"
import { pad2 } from "@/libs/utils"

import { episodeValidator, skipValidator } from "./validator.zod"

/**
 * Picked outside the `withRole` callbacks: inline, TypeScript infers `pick`'s keys from the callback's generic
 * return type and types the row as the whole table.
 */
const contextFields = {
  episode: pick(episodeColumns, ["id", "seasonId", "episodeNo", "skips", "thumbnail"]),
  season: pick(seasonColumns, ["kind", "seasonNo", "sources"]),
  content: pick(contentColumns, ["id", "sourceDir"])
}
const contextTrackFields = pick(trackColumns, [
  "language",
  "isDubbed",
  "path",
  "duration"
])

/**
 * Loads what the skip and thumbnail actions check against: the episode, where its season's art goes, and its
 * tracks (paths included; this never leaves the server).
 */
async function readEpisodeContext(episodeId: string) {
  const [[row], tracks] = await Promise.all([
    db
      .select(contextFields)
      .from(schema.episodes)
      .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
      .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
      .where(eq(schema.episodes.id, episodeId))
      .limit(1),
    db
      .select(contextTrackFields)
      .from(schema.tracks)
      .where(eq(schema.tracks.episodeId, episodeId))
  ])

  return row ? { ...row, tracks } : null
}

/**
 * Saves the control panel's edit-episode form (kind, title, synopsis, aired date). Staff only.
 *
 * @param episodeId - `episodes.id`
 * @param input - The form values, validated with `episodeValidator`
 * @returns `{ ok: true }`, or field `errors` / a `message` for expected failures
 */
export const updateEpisode = withRole(
  STAFF_ROLES,
  async (_account, episodeId: unknown, input: unknown) => {
    const id = z.uuid().safeParse(episodeId)
    const parsed = episodeValidator.safeParse(input)
    if (!id.success) {
      return { ok: false as const, message: "Episode not found" }
    }
    if (!parsed.success) {
      return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
    }

    /**
     * `set` skips `undefined`, so an optional field the form cleared is written as `null` explicitly.
     */
    const [episode] = await db
      .update(schema.episodes)
      .set({
        kind: parsed.data.kind,
        title: parsed.data.title ?? null,
        synopsis: parsed.data.synopsis ?? null,
        airedOn: parsed.data.airedOn ?? null
      })
      .where(eq(schema.episodes.id, id.data))
      .returning({ seasonId: schema.episodes.seasonId })
    if (!episode) {
      return { ok: false as const, message: "Episode not found" }
    }

    const [season] = await db
      .select({ contentId: schema.seasons.contentId })
      .from(schema.seasons)
      .where(eq(schema.seasons.id, episode.seasonId))
      .limit(1)

    updateTag(`episodes/${id.data}`)
    updateTag(`seasons/${episode.seasonId}/episodes`)
    if (season) updateTag(`contents/${season.contentId}/episodes`)

    return { ok: true as const }
  }
)

/**
 * Sets one skip of an episode from the skip editor, replacing the skip of the same kind. Staff only.
 *
 * Skips are shared by every track of the episode (dubs are assumed to keep the original's timing), so the
 * end is checked against the longest track. Skips of different kinds may not overlap.
 *
 * @param episodeId - `episodes.id`
 * @param input - The skip, validated with `skipValidator`
 * @returns `{ ok: true, skips }` with the episode's skips by start, or field `errors` / a `message`
 */
export const saveSkip = withRole(
  STAFF_ROLES,
  async (_account, episodeId: unknown, input: unknown) => {
    const id = z.uuid().safeParse(episodeId)
    const parsed = skipValidator.safeParse(input)
    if (!id.success) {
      return { ok: false as const, message: "Episode not found" }
    }
    if (!parsed.success) {
      return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
    }

    const context = await readEpisodeContext(id.data)
    if (!context) {
      return { ok: false as const, message: "Episode not found" }
    }
    if (context.tracks.length === 0) {
      return { ok: false as const, message: "This episode has no tracks yet" }
    }

    const skip = parsed.data
    const duration = Math.max(...context.tracks.map((track) => track.duration))
    if (skip.to > duration) {
      return {
        ok: false as const,
        errors: { to: [`The episode ends at ${formatTime(duration, duration)}`] }
      }
    }

    const others = context.episode.skips.filter((other) => other.kind !== skip.kind)
    const overlap = others.find((other) => skip.from < other.to && other.from < skip.to)
    if (overlap) {
      return {
        ok: false as const,
        errors: { from: [`Overlaps the ${overlap.kind} skip`] }
      }
    }

    const skips = [...others, skip].toSorted((a, b) => a.from - b.from)
    await db.update(schema.episodes).set({ skips }).where(eq(schema.episodes.id, id.data))

    updateTag(`episodes/${id.data}`)
    return { ok: true as const, skips }
  }
)

/**
 * Removes one skip of an episode. Staff only.
 *
 * @param episodeId - `episodes.id`
 * @param kind - The skip's kind (`SKIP_KINDS`)
 * @returns `{ ok: true, skips }` with the skips left, or a `message`
 */
export const deleteSkip = withRole(
  STAFF_ROLES,
  async (_account, episodeId: unknown, kind: unknown) => {
    const id = z.uuid().safeParse(episodeId)
    const skipKind = z.enum(SKIP_KINDS).safeParse(kind)
    if (!id.success || !skipKind.success) {
      return { ok: false as const, message: "Skip not found" }
    }

    const [episode] = await db
      .select({ skips: schema.episodes.skips })
      .from(schema.episodes)
      .where(eq(schema.episodes.id, id.data))
      .limit(1)
    if (!episode) {
      return { ok: false as const, message: "Episode not found" }
    }

    const skips = episode.skips.filter((skip) => skip.kind !== skipKind.data)
    await db.update(schema.episodes).set({ skips }).where(eq(schema.episodes.id, id.data))

    updateTag(`episodes/${id.data}`)
    return { ok: true as const, skips }
  }
)

/**
 * Grabs a hand-picked thumbnail for an episode at `seconds` of its art track (`artTrack`, the one
 * `tests/track.spec.ts` uses), over the current file, or into the season's art folder when it has none yet.
 * Staff only. Writes to disk through ffmpeg, which must be on the server's PATH.
 *
 * Browsers and the image optimizer may keep showing the old image for up to a day (`/api/art` caching).
 *
 * @param episodeId - `episodes.id`
 * @param seconds - Where on the timeline to grab the frame
 * @returns `{ ok: true }`, or a `message`
 */
export const captureThumbnail = withRole(
  STAFF_ROLES,
  async (_account, episodeId: unknown, seconds: unknown) => {
    const id = z.uuid().safeParse(episodeId)
    const time = z.number().min(0).safeParse(seconds)
    if (!id.success || !time.success) {
      return { ok: false as const, message: "Pick an episode and a time" }
    }

    const context = await readEpisodeContext(id.data)
    if (!context) {
      return { ok: false as const, message: "Episode not found" }
    }

    const track = artTrack(context.tracks)
    if (!track) {
      return { ok: false as const, message: "This episode has no tracks yet" }
    }
    if (time.data >= track.duration) {
      return { ok: false as const, message: "That time is past the end of the episode" }
    }

    const directory = context.episode.thumbnail
      ? path.posix.dirname(context.episode.thumbnail)
      : seasonArtDirectory(context.content.sourceDir, context.season)
    if (!directory) {
      return {
        ok: false as const,
        message: "The season's primary source isn't inside the content's folder"
      }
    }
    if (!(await hasFfmpeg())) {
      return { ok: false as const, message: "ffmpeg isn't available on the server" }
    }

    const target =
      context.episode.thumbnail ??
      path.posix.join(directory, `${pad2(context.episode.episodeNo)}.webp`)

    try {
      await fs.promises.mkdir(directory, { recursive: true })
      await writeThumbnail(track.path, time.data, target)
    } catch (error) {
      logger(`⛔ Thumbnail capture failed for ${target}: ${String(error)}`)
      return { ok: false as const, message: "ffmpeg couldn't grab that frame" }
    }

    if (!context.episode.thumbnail) {
      await db
        .update(schema.episodes)
        .set({ thumbnail: target })
        .where(eq(schema.episodes.id, id.data))
      updateTag(`seasons/${context.episode.seasonId}/episodes`)
      updateTag(`contents/${context.content.id}/episodes`)
    }

    updateTag(`episodes/${id.data}`)
    return { ok: true as const }
  }
)
