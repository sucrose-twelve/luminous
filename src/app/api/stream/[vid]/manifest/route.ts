import type { NextRequest } from "next/server"

import { withGuard } from "@/actions/auth"

import { readTrack } from "../actions/read"
import { paramValidator } from "../validator.zod"

/**
 * Returns what the MSE player needs before fetching bytes: codec string, duration, init segment end, and the
 * fragment index computed at import time.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/stream/[vid]/manifest">
) {
  const account = await withGuard(request)
  if (!account) return new Response(null, { status: 401 })

  const parsed = paramValidator.safeParse(await ctx.params)
  if (!parsed.success) return new Response(null, { status: 404 })

  const track = await readTrack(parsed.data.vid)
  if (!track) return new Response(null, { status: 404 })

  const { mimeCodec, duration, initEnd, fragments } = track

  return Response.json(
    { mimeCodec, duration, initEnd, fragments },
    { headers: { "Cache-Control": "private, max-age=86400" } }
  )
}
