import { execFileSync } from "child_process"

import { parseRate } from "./utils"

type ProbeStream = {
  codec_type?: string
  codec_name?: string
  width?: number
  height?: number
  avg_frame_rate?: string
  r_frame_rate?: string
  disposition?: { attached_pic?: number }
  side_data_list?: { rotation?: number }[]
  tags?: { rotate?: string }
}

export type VideoInfo = {
  width: number
  height: number
  fps: number
  /**
   * Exact frame rate as a fraction, e.g. `30000/1001`.
   */
  rate: string
  rotation: number
  audioCodecs: string[]
  duration: number
}

/**
 * Reads the first real video stream (cover art is skipped), every audio codec, and the duration.
 *
 * `avg_frame_rate` comes first since `r_frame_rate` is the stream's base rate, which a variable frame rate
 * video reports far too high.
 *
 * @throws When ffprobe can't read the file, it has no video stream, or its frame rate is unknown
 */
export function probeVideo(filePath: string): VideoInfo {
  const output = execFileSync(
    "ffprobe",
    ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", filePath],
    {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 64 // 64 Megabytes
    }
  )

  const result = JSON.parse(output) as {
    format?: { duration?: string }
    streams?: ProbeStream[]
  }
  const streams = result.streams ?? []

  const video = streams.find(
    (stream) => stream.codec_type === "video" && !stream.disposition?.attached_pic
  )
  if (!video?.width || !video.height) throw new Error("No video stream")

  const rate = [video.avg_frame_rate, video.r_frame_rate].find(
    (item) => parseRate(item) > 0
  )
  if (!rate) throw new Error("Can't read the frame rate")

  const rotation =
    video.side_data_list?.find((data) => data.rotation !== undefined)?.rotation ??
    video.tags?.rotate

  return {
    width: video.width,
    height: video.height,
    fps: parseRate(rate),
    rate,
    rotation: Number(rotation ?? 0),
    audioCodecs: streams
      .filter((stream) => stream.codec_type === "audio")
      .map((stream) => stream.codec_name ?? "unknown"),
    duration: Number(result.format?.duration) || 0
  }
}

/**
 * The container duration in seconds, or `0` when ffprobe can't read one (a truncated file).
 */
export function probeDuration(filePath: string) {
  try {
    const output = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", filePath],
      { encoding: "utf-8" }
    )
    return Number(output.trim()) || 0
  } catch {
    return 0
  }
}
