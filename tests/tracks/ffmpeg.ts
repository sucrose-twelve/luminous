import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"

import {
  COPY_AUDIO_CODECS,
  COPY_VIDEO_CODECS,
  H264_PIXEL_FORMATS,
  ORIGINAL_FOLDER,
  REMUX_DURATION_TOLERANCE,
  REMUX_SUFFIX
} from "./constants"
import { probe, type ProbeStream } from "./ffprobe"
import { isFragmented } from "./mp4"
import { type EpisodeFile } from "./source"

export type RemuxPlan = {
  file: EpisodeFile
  duration: number
  tagHvc1: boolean
  /**
   * Channel count to re-encode the audio to AAC with, or `null` to copy it.
   */
  aacChannels: number | null
  reasons: string[]
}

/**
 * Lists the tools the script needs (ffprobe for every file, ffmpeg for remuxing and art) that don't run from the
 * PATH.
 */
export function missingTools() {
  return ["ffmpeg", "ffprobe"].filter((tool) => {
    try {
      execFileSync(tool, ["-version"], { stdio: "ignore" })
      return false
    } catch {
      return true
    }
  })
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
 */
export async function writeWebp(target: string, args: string[]) {
  const temp = target.replace(/\.webp$/, ".tmp.webp")

  try {
    execFileSync("ffmpeg", ["-v", "error", "-y", ...args, temp], {
      stdio: ["ignore", "ignore", "pipe"],
      maxBuffer: 1024 * 1024 * 64 // 64 Megabytes
    })
    await fs.promises.rename(temp, target)
  } catch (error) {
    await fs.promises.rm(temp, { force: true })
    throw error
  }
}

/**
 * Where `--remux` keeps a replaced file: `<folder>/.original/<name>.mp4`.
 */
function backupPath(filePath: string) {
  return path.join(path.dirname(filePath), ORIGINAL_FOLDER, path.basename(filePath))
}

/**
 * Deletes the `.original/` backups of these files, then each `.original/` folder left empty. Called only once
 * the whole run has succeeded: every file read back as a valid fragmented MP4, imported, and given its art.
 *
 * Only the backups of the given files are removed, never the whole folder, since a folder of movies may hold
 * backups from another season's run.
 *
 * @returns How many backups were deleted
 */
export async function removeBackups(filePaths: string[]) {
  const backups = filePaths.map(backupPath).filter((backup) => fs.existsSync(backup))

  for (const backup of backups) {
    await fs.promises.rm(backup)
  }

  for (const directory of new Set(backups.map((backup) => path.dirname(backup)))) {
    const remaining = await fs.promises.readdir(directory)
    if (remaining.length === 0) await fs.promises.rmdir(directory)
  }

  return backups.length
}

/**
 * Checks that browsers can decode a video stream as it is, so a remux can copy it.
 *
 * @returns Whether the stream must be re-tagged `hvc1`
 * @throws When the video needs a re-encode (codec or pixel format browsers can't decode)
 */
export function checkVideo(video: ProbeStream | null) {
  if (!video?.codec_name) throw new Error("No video stream")
  if (!COPY_VIDEO_CODECS.includes(video.codec_name)) {
    throw new Error(`Video ${video.codec_name} needs a re-encode (ffmpeg -c:v libx264)`)
  }
  if (video.codec_name === "h264" && !H264_PIXEL_FORMATS.includes(video.pix_fmt ?? "")) {
    throw new Error(
      `H.264 ${video.pix_fmt} (10-bit or 4:2:2/4:4:4) needs a re-encode to 8-bit yuv420p`
    )
  }

  /**
   * Safari plays HEVC only when tagged `hvc1`. Re-tagging `hev1` is a remux, not a re-encode.
   */
  return video.codec_name === "hevc" && video.codec_tag_string !== "hvc1"
}

/**
 * Channel count to re-encode an audio stream to AAC with, or `null` when it can be copied as it is.
 */
export function aacChannelsOf(audio: ProbeStream | null) {
  if (!audio?.codec_name || COPY_AUDIO_CODECS.includes(audio.codec_name)) return null
  return audio.channels ?? 2
}

/**
 * The ffmpeg output options of a remux, placed after the `-map`s of one output.
 *
 * Re-encoded audio keeps its channel layout (5.1 stays 5.1) at 64 kb/s per channel, never under 192 kb/s.
 * `+frag_keyframe` starts every fragment on a keyframe so seeking can decode it; `-min_frag_duration` stops short
 * GOPs from producing sub-second fragments.
 */
export function remuxArgs(tagHvc1: boolean, aacChannels: number | null) {
  return [
    ["-c:v", "copy"],
    tagHvc1 ? ["-tag:v", "hvc1"] : [],
    aacChannels
      ? ["-c:a", "aac", "-b:a", `${Math.max(192, aacChannels * 64)}k`]
      : ["-c:a", "copy"],
    [
      "-movflags",
      "+frag_keyframe+empty_moov+default_base_moof",
      "-min_frag_duration",
      "4000000"
    ]
  ].flat()
}

/**
 * Checks a remux output before it replaces anything: it must be fragmented and keep the source's duration.
 *
 * @throws When either check fails
 */
export async function checkRemux(filePath: string, duration: number) {
  if (!(await isFragmented(filePath))) throw new Error("Remux output is not fragmented")

  const remuxed = probe(filePath).duration
  if (Math.abs(remuxed - duration) > REMUX_DURATION_TOLERANCE) {
    throw new Error(
      `Remux changed the duration (${duration.toFixed(2)}s → ${remuxed.toFixed(2)}s)`
    )
  }
}

/**
 * Decides what `--remux` must do with one file, without touching it.
 *
 * @returns `null` when the file is already a playable fragmented MP4, otherwise the plan
 * @throws When the file needs a video re-encode (codec or pixel format browsers can't decode), or its
 * `.original/` slot is already taken
 */
export async function planRemux(file: EpisodeFile): Promise<RemuxPlan | null> {
  const { duration, video, audio } = probe(file.path)
  const reasons: string[] = []

  const tagHvc1 = checkVideo(video)
  if (tagHvc1) reasons.push(`tag ${video?.codec_tag_string} → hvc1`)

  const aacChannels = aacChannelsOf(audio)
  if (aacChannels) reasons.push(`audio ${audio?.codec_name} ${aacChannels}ch → aac`)

  if (!(await isFragmented(file.path))) reasons.push("not fragmented")
  if (reasons.length === 0) return null

  const backup = backupPath(file.path)
  if (fs.existsSync(backup)) {
    throw new Error(`${backup} already exists; move or delete it first`)
  }

  return { file, duration, tagHvc1, aacChannels, reasons }
}

/**
 * Remuxes one file into a fragmented MP4 in place, keeping the original in `.original/` until the run ends
 * (`removeBackups`).
 *
 * The output goes to a temp file next to the source (same drive, so the final rename is instant) and replaces
 * the source only after it is checked: it must be fragmented and keep the original duration. On any failure
 * the temp file is removed and the source is left untouched.
 *
 * Keeps only the first video and audio stream (no subtitles in this project), with the options of `remuxArgs`.
 */
export async function remuxFile({ file, duration, tagHvc1, aacChannels }: RemuxPlan) {
  const directory = path.dirname(file.path)
  const temp = path.join(directory, `${path.parse(file.path).name}${REMUX_SUFFIX}`)
  const backup = backupPath(file.path)

  try {
    execFileSync(
      "ffmpeg",
      [
        ["-v", "error", "-y", "-i", file.path],
        ["-map", "0:v:0", "-map", "0:a:0?"],
        remuxArgs(tagHvc1, aacChannels),
        [temp]
      ].flat(),
      {
        stdio: ["ignore", "ignore", "pipe"],
        maxBuffer: 1024 * 1024 * 64 // 64 Megabytes
      }
    )

    await checkRemux(temp, duration)
  } catch (error) {
    await fs.promises.rm(temp, { force: true })
    throw error
  }

  await fs.promises.mkdir(path.dirname(backup), { recursive: true })
  await fs.promises.rename(file.path, backup)

  try {
    await fs.promises.rename(temp, file.path)
  } catch (error) {
    await fs.promises.rename(backup, file.path)
    await fs.promises.rm(temp, { force: true })
    throw error
  }
}
