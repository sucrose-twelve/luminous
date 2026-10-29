/**
 * ffmpeg helpers shared by the import script (`tests/track.spec.ts`) and the control panel's thumbnail capture.
 * Server only. ffmpeg runs asynchronously, so a capture in a Server Action doesn't hold up the server's other
 * requests (video streams) while it works.
 */
import { execFile } from "node:child_process"
import fs from "node:fs"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

/**
 * The size of an episode thumbnail, 16:9.
 */
export const THUMBNAIL_WIDTH = 640
export const THUMBNAIL_HEIGHT = 360

/**
 * Whether `ffmpeg` runs from the PATH of this process.
 */
export async function hasFfmpeg() {
  try {
    await execFileAsync("ffmpeg", ["-version"])
    return true
  } catch {
    return false
  }
}

/**
 * Scales a frame into a box without stretching it, letterboxing the rest (a 4:3 source gets side bars).
 */
export function fitFilter(width: number, height: number) {
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`
}

/**
 * Runs ffmpeg into `<target>.tmp.webp`, then renames it over `target`, so a crash never leaves half a file at
 * the real path.
 *
 * @param args - ffmpeg's arguments up to (not including) the output file
 */
export async function writeWebp(target: string, args: string[]) {
  const temp = target.replace(/\.webp$/, ".tmp.webp")

  try {
    await execFileAsync("ffmpeg", ["-v", "error", "-y", ...args, temp], {
      maxBuffer: 1024 * 1024 * 64
    })
    await fs.promises.rename(temp, target)
  } catch (error) {
    await fs.promises.rm(temp, { force: true })
    throw error
  }
}

/**
 * Grabs one `THUMBNAIL_WIDTH`×`THUMBNAIL_HEIGHT` frame of `video` at `seconds` into `target`. `-ss` before `-i`
 * seeks to the keyframe before the time, then decodes up to it, so the frame is exact.
 *
 * @example
 * ```ts
 * await writeThumbnail(track.path, 754.2, "<sourceDir>/Thumbnails/1/01.webp")
 * ```
 */
export async function writeThumbnail(video: string, seconds: number, target: string) {
  await writeWebp(
    target,
    [
      ["-ss", seconds.toFixed(3), "-i", video],
      ["-frames:v", "1", "-vf", fitFilter(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT), "-an"],
      ["-c:v", "libwebp", "-quality", "80"]
    ].flat()
  )
}
