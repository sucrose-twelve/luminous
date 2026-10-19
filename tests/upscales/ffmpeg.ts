import { execFileSync } from "child_process"

import { AAC_BITRATE, FINAL_QUALITY, MP4_AUDIO_CODECS } from "./constants"
import { type UpscalePlan } from "./plan"

export type Encoder = {
  name: string
  args: string[]
}

/**
 * The final encoder: HEVC 10-bit on NVENC when ffmpeg has it, otherwise libx265 (much slower, same format).
 */
export function findEncoder(): Encoder {
  const encoders = execFileSync("ffmpeg", ["-hide_banner", "-encoders"], {
    encoding: "utf-8"
  })

  if (encoders.includes(" hevc_nvenc ")) {
    return {
      name: "hevc_nvenc",
      args: [
        ["-c:v", "hevc_nvenc", "-preset", "p7", "-tune", "hq"],
        ["-rc", "vbr", "-cq", String(FINAL_QUALITY), "-b:v", "0"],
        ["-spatial-aq", "1", "-temporal-aq", "1", "-rc-lookahead", "32"],
        ["-profile:v", "main10", "-pix_fmt", "p010le"]
      ].flat()
    }
  }

  return {
    name: "libx265",
    args: [
      ["-c:v", "libx265", "-preset", "slow", "-crf", String(FINAL_QUALITY)],
      ["-pix_fmt", "yuv420p10le"]
    ].flat()
  }
}

/**
 * The final encode's video filters: a Lanczos resize of the short side to `height` whatever the orientation
 * (`-2` keeps the long side even), then the exact output frame rate.
 *
 * `fps` also runs after any interpolation, even at the right rate, since MKV intermediates come back with
 * rates like `19001/317`.
 */
export function encodeFilters(plan: UpscalePlan, height: number) {
  const filters: string[] = []

  if (plan.resize) {
    filters.push(
      `scale='if(gt(iw,ih),-2,${height})':'if(gt(iw,ih),${height},-2)':flags=lanczos`
    )
  }
  if (plan.resample || plan.multiplier) filters.push(`fps=${plan.outputRate}`)

  return filters
}

/**
 * The ffmpeg command of the final encode. Video comes from `video` (the last intermediate, or the source when
 * no AI step ran) and audio always from `source`, since the Video2X steps drop it. Audio is copied when MP4
 * can carry every stream, otherwise re-encoded to AAC. HEVC is tagged `hvc1` so Safari plays it.
 */
export function encodeCommand({
  source,
  video,
  audioCodecs,
  filters,
  encoder,
  output
}: {
  source: string
  video: string
  audioCodecs: string[]
  filters: string[]
  encoder: Encoder
  output: string
}) {
  const audioInput = video === source ? 0 : 1
  const copyAudio = audioCodecs.every((codec) => MP4_AUDIO_CODECS.includes(codec))

  return [
    ["ffmpeg", "-hide_banner", "-loglevel", "warning", "-stats", "-y", "-i", video],
    audioInput ? ["-i", source] : [],
    ["-map", "0:v:0", "-map", `${audioInput}:a?`],
    filters.length > 0 ? ["-vf", filters.join(",")] : [],
    encoder.args,
    ["-tag:v", "hvc1"],
    copyAudio ? ["-c:a", "copy"] : ["-c:a", "aac", "-b:a", AAC_BITRATE],
    ["-movflags", "+faststart", output]
  ].flat()
}
