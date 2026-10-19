import { execFileSync } from "child_process"

export type ProbeStream = {
  index?: number
  codec_type?: string
  codec_name?: string
  codec_tag_string?: string
  pix_fmt?: string
  channels?: number
  width?: number
  height?: number
  tags?: { language?: string }
}

/**
 * Reads the duration and every stream with ffprobe. `video` and `audio` are the first of each, the streams
 * `--remux` keeps.
 */
export function probe(filePath: string) {
  const output = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=index,codec_type,codec_name,codec_tag_string,pix_fmt,channels,width,height:stream_tags=language",
      "-of",
      "json",
      filePath
    ],
    {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 64 // 64 Megabytes
    }
  )

  const result = JSON.parse(output) as {
    format?: { duration?: string }
    streams?: ProbeStream[]
  }

  const duration = Number(result.format?.duration)
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error("ffprobe returned no duration")

  const video = result.streams?.find((stream) => stream.codec_type === "video") ?? null
  const audio = result.streams?.find((stream) => stream.codec_type === "audio") ?? null
  return {
    duration,
    width: video?.width ?? null,
    height: video?.height ?? null,
    video,
    audio,
    streams: result.streams ?? []
  }
}
