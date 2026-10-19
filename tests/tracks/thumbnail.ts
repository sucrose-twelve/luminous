import {
  THUMBNAIL_AFTER_INTRO,
  THUMBNAIL_FALLBACK_RATIO,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_WIDTH
} from "./constants"
import { fitFilter, writeWebp } from "./ffmpeg"

/**
 * Picks the second to grab the thumbnail at: just after the intro if there is one, otherwise a quarter in.
 */
function thumbnailTime(duration: number, skips: Content.Skip[]) {
  const intro = skips.find((skip) => skip.kind === "intro")
  const time = intro ? intro.to + THUMBNAIL_AFTER_INTRO : duration * THUMBNAIL_FALLBACK_RATIO
  return Math.min(time, Math.max(duration - 1, 0))
}

/**
 * Grabs one 640×360 frame of `video` into `target`. `-ss` before `-i` seeks to the keyframe before the time,
 * then decodes up to it.
 */
export async function writeThumbnail(video: string, duration: number, skips: Content.Skip[], target: string) {
  await writeWebp(
    target,
    [
      ["-ss", thumbnailTime(duration, skips).toFixed(3), "-i", video],
      ["-frames:v", "1", "-vf", fitFilter(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT), "-an"],
      ["-c:v", "libwebp", "-quality", "80"]
    ].flat()
  )
}
