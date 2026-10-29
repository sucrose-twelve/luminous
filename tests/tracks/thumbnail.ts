import { THUMBNAIL_AFTER_INTRO, THUMBNAIL_FALLBACK_RATIO } from "./constants"

/**
 * Picks the second to grab the thumbnail at: just after the intro if there is one, otherwise a quarter in. The
 * frame itself is written by `writeThumbnail` (`@/libs/ffmpeg`), which the control panel shares.
 */
export function thumbnailTime(duration: number, skips: Content.Skip[]) {
  const intro = skips.find((skip) => skip.kind === "intro")
  const time = intro ? intro.to + THUMBNAIL_AFTER_INTRO : duration * THUMBNAIL_FALLBACK_RATIO
  return Math.min(time, Math.max(duration - 1, 0))
}
