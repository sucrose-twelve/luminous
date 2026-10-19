import fs from "node:fs"
import path from "node:path"

import type { NextRequest } from "next/server"

import {
  IMAGE_EXTENSIONS,
  imageMimeType,
  isSafeMediaPath,
  readFileStream
} from "@/libs/media"

import { readPoster, readSprite, readThumbnail } from "./actions/read"
import { paramValidator, type ParamValidator } from "./validator.zod"

const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800"

/**
 * Art reader per `kind`: poster → `seasons.id`, thumbnail and sprite → `episodes.id`.
 */
const READERS = {
  poster: readPoster,
  thumbnail: readThumbnail,
  sprite: readSprite
} satisfies Record<
  ParamValidator["kind"],
  (id: string) => Promise<{ path: string | null; directory: string | null } | null>
>

/**
 * Checks an `If-None-Match` header (a list of tags, possibly weak or `*`) against the file's ETag.
 */
function isNotModified(ifNoneMatch: string | null, etag: string) {
  if (!ifNoneMatch) return false

  return ifNoneMatch
    .split(",")
    .map((tag) => tag.trim())
    .some((tag) => tag === "*" || tag === etag || tag === `W/${etag}`)
}

/**
 * Serves season posters, episode thumbnails, and episode sprite sheets by ID.
 *
 * Sprite sheets are used as a CSS background by the player, never through `next/image`: the optimizer would
 * resize the whole sheet and break the tile offsets.
 *
 * No auth on purpose: the `next/image` optimizer fetches art server-side without the user's cookies, so an
 * authenticated route would break every optimized image. The route still takes only IDs, never paths.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/art/[kind]/[id]">
) {
  const parsed = paramValidator.safeParse(await ctx.params)
  if (!parsed.success) return new Response(null, { status: 404 })

  const { kind, id } = parsed.data
  const art = await READERS[kind](id)
  if (!art?.path) return new Response(null, { status: 404 })

  const contentType = imageMimeType(art.path)
  if (!contentType || !isSafeMediaPath(art.path, art.directory, IMAGE_EXTENSIONS)) {
    return new Response(null, { status: 403 })
  }

  const filePath = path.resolve(art.path)
  const stats = await fs.promises.stat(filePath).catch(() => null)
  if (!stats?.isFile()) return new Response(null, { status: 404 })

  const etag = `"${stats.size}-${Math.trunc(stats.mtimeMs)}"`
  if (isNotModified(request.headers.get("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers: { "ETag": etag, "Cache-Control": CACHE_CONTROL }
    })
  }

  return new Response(readFileStream(filePath, request.signal), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stats.size),
      "ETag": etag,
      "Cache-Control": CACHE_CONTROL
    }
  })
}
