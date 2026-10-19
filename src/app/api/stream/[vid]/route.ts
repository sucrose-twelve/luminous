import fs from "node:fs"
import path from "node:path"

import type { NextRequest } from "next/server"

import { withGuard } from "@/actions/auth"
import { isSafeMediaPath, readFileStream, VIDEO_EXTENSIONS } from "@/libs/media"

import { readTrack } from "./actions/read"
import { paramValidator } from "./validator.zod"

const MAX_CHUNK = 4 * 1024 * 1024

/**
 * Resolves a `Range` header to an inclusive byte range, capping open-ended ranges at `MAX_CHUNK`.
 *
 * Explicit ranges are served in full: the MSE player requests whole fragments, and one can exceed `MAX_CHUNK`.
 *
 * A missing or unparseable header (including multi-range requests) falls back to the first chunk, so native
 * `<video src>` playback still works. A suffix range (`bytes=-500`) means the last N bytes.
 */
function parseRange(header: string | null, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? "")
  const [, from = "", to = ""] = match ?? []

  if (!from && to) {
    const start = Math.max(size - Number(to), 0)
    return { start, end: Math.min(start + MAX_CHUNK - 1, size - 1) }
  }

  const start = from ? Number(from) : 0
  const end = Math.min(to ? Number(to) : start + MAX_CHUNK - 1, size - 1)
  return { start, end }
}

/**
 * Streams a track's fragmented MP4 bytes with HTTP Range support. Always answers `206`.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/stream/[vid]">) {
  const account = await withGuard(request)
  if (!account) return new Response(null, { status: 401 })

  const parsed = paramValidator.safeParse(await ctx.params)
  if (!parsed.success) return new Response(null, { status: 404 })

  const track = await readTrack(parsed.data.vid)
  if (!track) return new Response(null, { status: 404 })

  if (!track.root || !isSafeMediaPath(track.path, track.root, VIDEO_EXTENSIONS)) {
    return new Response(null, { status: 403 })
  }

  const filePath = path.resolve(track.path)
  const stats = await fs.promises.stat(filePath).catch(() => null)
  if (!stats?.isFile()) return new Response(null, { status: 404 })

  const size = stats.size
  const { start, end } = parseRange(request.headers.get("range"), size)

  if (start >= size || start > end) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` }
    })
  }

  return new Response(readFileStream(filePath, request.signal, { start, end }), {
    status: 206,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=86400"
    }
  })
}
