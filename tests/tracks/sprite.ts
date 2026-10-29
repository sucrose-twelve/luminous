import { fitFilter, writeWebp } from "@/libs/ffmpeg"

import { SPRITE_INTERVAL, SPRITE_INTERVAL_STEP, SPRITE_TILE, WEBP_MAX_DIMENSION } from "./constants"

/**
 * Lays out the sprite sheet for a duration: one tile every `interval` seconds, widening `interval` until the
 * sheet stays under the WebP size limit.
 */
export function spriteGrid(duration: number): Content.SpriteGrid {
  let interval = SPRITE_INTERVAL

  while (
    Math.ceil(Math.ceil(duration / interval) / SPRITE_TILE.columns) * SPRITE_TILE.height >
    WEBP_MAX_DIMENSION
  ) {
    interval += SPRITE_INTERVAL_STEP
  }

  return { interval, ...SPRITE_TILE, count: Math.max(Math.ceil(duration / interval), 1) }
}

/**
 * Tiles one frame of `video` every `grid.interval` seconds into a single sheet at `target`.
 *
 * `-skip_frame nokey` decodes keyframes only, which is several times faster; a tile may then be off by up to one
 * keyframe gap (2–4 s), fine for a preview. Since the last keyframe can fall well before the end, `tpad` repeats
 * it and `trim` cuts to exactly `grid.count` tiles, so the sheet always matches the grid stored in the DB.
 */
export async function writeSprite(video: string, grid: Content.SpriteGrid, target: string) {
  const rows = Math.ceil(grid.count / grid.columns)
  const filters = [
    `tpad=stop_mode=clone:stop_duration=${grid.interval * 2}`,
    `fps=1/${grid.interval}`,
    `trim=end_frame=${grid.count}`,
    fitFilter(grid.width, grid.height),
    `tile=${grid.columns}x${rows}`
  ]

  await writeWebp(
    target,
    [
      ["-skip_frame", "nokey", "-i", video],
      ["-vf", filters.join(","), "-frames:v", "1", "-an"],
      ["-c:v", "libwebp", "-quality", "60"]
    ].flat()
  )
}
