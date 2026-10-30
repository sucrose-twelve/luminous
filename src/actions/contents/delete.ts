"use server"

import fs from "node:fs"
import path from "node:path"

import { and, eq, exists, ilike, ne, or, sql } from "drizzle-orm"
import { updateTag } from "next/cache"
import { z } from "zod"

import { withRole } from "@/actions/auth"
import { ROOT_ROLES } from "@/constants"
import { db, schema } from "@/drizzle"
import { logger } from "@/libs/logger"
import { pathType } from "@/libs/media"

import { escapeLike } from "./search"

/**
 * Whether `child` is `parent` or sits inside it. `path.relative` compares the way the file system does, so on
 * Windows case and slash direction don't matter.
 */
function isInside(child: string, parent: string) {
  const relative = path.relative(parent, child)
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  )
}

/**
 * Finds why a content's folder must not be deleted: it isn't a full path, it's a drive root, it holds the app
 * itself, or another content's folder, poster, source, art, or track is in it or around it.
 *
 * @returns The reason, or `null` when the whole folder belongs to this content
 */
async function folderConflict(contentId: string, folder: string) {
  if (!path.isAbsolute(folder)) return "The source directory isn't a full path"

  const resolved = path.resolve(folder)
  if (path.dirname(resolved) === resolved) return "The source directory is a drive root"
  if (isInside(process.cwd(), resolved))
    return "The source directory holds the app itself"

  const pattern = `${escapeLike(folder)}/%`
  const [others, [seasonFile], [episodeFile]] = await Promise.all([
    db
      .select({ title: schema.contents.title, sourceDir: schema.contents.sourceDir })
      .from(schema.contents)
      .where(ne(schema.contents.id, contentId)),
    db
      .select({ title: schema.contents.title })
      .from(schema.seasons)
      .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
      .where(
        and(
          ne(schema.contents.id, contentId),
          or(
            ilike(schema.seasons.poster, pattern),
            sql`exists (select 1 from jsonb_array_elements(${schema.seasons.sources}) as element(value) where element.value ->> 'pathname' ilike ${pattern})`
          )
        )
      )
      .limit(1),
    db
      .select({ title: schema.contents.title })
      .from(schema.episodes)
      .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
      .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
      .where(
        and(
          ne(schema.contents.id, contentId),
          or(
            ilike(schema.episodes.thumbnail, pattern),
            ilike(schema.episodes.sprite, pattern),
            exists(
              db
                .select({ id: schema.tracks.id })
                .from(schema.tracks)
                .where(
                  and(
                    eq(schema.tracks.episodeId, schema.episodes.id),
                    ilike(schema.tracks.path, pattern)
                  )
                )
            )
          )
        )
      )
      .limit(1)
  ])

  const overlap = others.find(
    (other) => isInside(other.sourceDir, resolved) || isInside(resolved, other.sourceDir)
  )
  if (overlap) return `The folder overlaps the folder of "${overlap.title}"`

  const shared = seasonFile ?? episodeFile
  if (shared) return `"${shared.title}" keeps files in this folder`

  return null
}

/**
 * Deletes a content for good: its row and, through the foreign keys, its seasons, episodes, tracks, and every
 * account's watch history and list entries for it, then its source directory with everything in it. Root only.
 *
 * The folder is renamed aside first, which fails while a file in it is open (a stream, another app), so nothing
 * is deleted unless all of it can be; a failed delete in the DB renames it back. Files of the content outside
 * the folder (a poster may sit anywhere) are left, and counted in the result.
 *
 * @param contentId - `contents.id`
 * @param confirmation - The content's slug, typed by the user to confirm
 * @returns What was deleted, with `leftover` naming a folder that couldn't be removed, or a `message`
 */
export const deleteContent = withRole(
  ROOT_ROLES,
  async (_account, contentId: unknown, confirmation: unknown) => {
    const id = z.uuid().safeParse(contentId)
    if (!id.success) return { ok: false as const, message: "Content not found" }

    const [content] = await db
      .select({
        id: schema.contents.id,
        slug: schema.contents.slug,
        sourceDir: schema.contents.sourceDir
      })
      .from(schema.contents)
      .where(eq(schema.contents.id, id.data))
      .limit(1)
    if (!content) return { ok: false as const, message: "Content not found" }
    if (confirmation !== content.slug) {
      return { ok: false as const, message: "Type the content's slug to confirm" }
    }

    const folder = content.sourceDir
    const [conflict, seasons, episodes, tracks] = await Promise.all([
      folderConflict(content.id, folder),
      db
        .select({ id: schema.seasons.id, poster: schema.seasons.poster })
        .from(schema.seasons)
        .where(eq(schema.seasons.contentId, content.id)),
      db
        .select({
          id: schema.episodes.id,
          thumbnail: schema.episodes.thumbnail,
          sprite: schema.episodes.sprite
        })
        .from(schema.episodes)
        .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
        .where(eq(schema.seasons.contentId, content.id)),
      db
        .select({ id: schema.tracks.id, path: schema.tracks.path })
        .from(schema.tracks)
        .innerJoin(schema.episodes, eq(schema.tracks.episodeId, schema.episodes.id))
        .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
        .where(eq(schema.seasons.contentId, content.id))
    ])
    if (conflict)
      return { ok: false as const, message: `${conflict}, so nothing was deleted` }

    const isOnDisk = (await pathType(folder)) === "directory"
    const aside = `${folder}.deleting-${Date.now()}`

    if (isOnDisk) {
      try {
        await fs.promises.rename(folder, aside)
      } catch (error) {
        logger(`⛔ Couldn't move ${folder} aside to delete it: ${String(error)}`)
        return {
          ok: false as const,
          message:
            "The folder couldn't be moved: a file in it may be open (playing, or in another app). Nothing was deleted."
        }
      }
    }

    try {
      await db.delete(schema.contents).where(eq(schema.contents.id, content.id))
    } catch (error) {
      if (isOnDisk) await fs.promises.rename(aside, folder)
      throw error
    }

    let leftover: string | null = null
    if (isOnDisk) {
      try {
        await fs.promises.rm(aside, { recursive: true, force: true, maxRetries: 3 })
      } catch (error) {
        logger(`⛔ Couldn't remove ${aside}: ${String(error)}`)
        leftover = aside
      }
    }

    updateTag("contents/list")
    updateTag("seasons/list")
    updateTag(`contents/${content.id}`)
    updateTag(`contents/${content.id}/episodes`)
    seasons.forEach((season) => {
      updateTag(`seasons/${season.id}`)
      updateTag(`seasons/${season.id}/episodes`)
    })
    episodes.forEach((episode) => updateTag(`episodes/${episode.id}`))
    tracks.forEach((track) => updateTag(`tracks/${track.id}`))

    const files = [
      ...seasons.map((season) => season.poster),
      ...episodes.flatMap((episode) => [episode.thumbnail, episode.sprite]),
      ...tracks.map((track) => track.path)
    ].filter((file) => file !== null)

    return {
      ok: true as const,
      deleted: {
        seasons: seasons.length,
        episodes: episodes.length,
        tracks: tracks.length
      },
      isFolderMissing: !isOnDisk,
      leftover,
      keptOutside: files.filter((file) => !isInside(file, folder)).length
    }
  }
)
