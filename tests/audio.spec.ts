import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import { parseArgs } from "util"

import { z } from "zod"

import { COLOR, logger } from "@/libs/logger"

import { REMUX_SUFFIX } from "./tracks/constants"
import {
  aacChannelsOf,
  checkRemux,
  checkVideo,
  missingTools,
  remuxArgs
} from "./tracks/ffmpeg"
import { probe, type ProbeStream } from "./tracks/ffprobe"
import { errorMessage, toStoredPath } from "./tracks/utils"

/**
 * `01.mkv` becomes `01.mp4` (Japanese audio) and `01-TH.mp4` (Thai audio), next to it.
 */
const OUTPUTS = [
  { language: "jpn", suffix: "" },
  { language: "tha", suffix: "-TH" }
] as const

const argsValidator = z.object({
  file: z.string().default("docs/streams.json"),
  dryRun: z.boolean().default(false)
})

/**
 * The streams of each input, as ffprobe listed them. A stream's `language` can be fixed by hand here when the
 * file's own tag is missing or wrong, since the script picks the audio by it. The `output_*` fields are ignored:
 * the outputs always go next to the input.
 */
const entriesValidator = z.array(
  z.object({
    input: z.string(),
    streams: z.array(
      z.object({
        index: z.number().int(),
        type: z.string(),
        language: z.string().optional()
      })
    )
  })
)

type Entry = z.infer<typeof entriesValidator>[number]

type SplitPlan = {
  input: string
  duration: number
  video: ProbeStream
  tagHvc1: boolean
  outputs: {
    language: string
    path: string
    audio: ProbeStream
    aacChannels: number | null
  }[]
}

/**
 * Finds the probed stream at a listed index, checking it is still the type the list says.
 */
function findStream(streams: ProbeStream[], index: number, type: string) {
  const stream = streams.find((item) => item.index === index)
  if (stream?.codec_type !== type)
    throw new Error(`Stream #${index} is not ${type}; the list is out of date`)
  return stream
}

/**
 * Decides how one input splits into its outputs, without touching it.
 *
 * @throws When the input is gone, an output already exists, the list has no video or no audio for a language,
 * or the video needs a re-encode
 */
function planSplit(entry: Entry): SplitPlan {
  if (!fs.existsSync(entry.input)) throw new Error("Input not found")

  const { dir, name } = path.parse(entry.input)
  const { duration, streams } = probe(entry.input)

  const listedVideo = entry.streams.find((stream) => stream.type === "video")
  if (!listedVideo) throw new Error("No video stream listed")

  const video = findStream(streams, listedVideo.index, "video")
  const tagHvc1 = checkVideo(video)

  const outputs = OUTPUTS.map(({ language, suffix }) => {
    const outputPath = path.join(dir, `${name}${suffix}.mp4`)
    if (fs.existsSync(outputPath))
      throw new Error(`${toStoredPath(outputPath)} already exists`)

    const listedAudio = entry.streams.find(
      (stream) => stream.type === "audio" && stream.language === language
    )
    if (!listedAudio) {
      const languages = entry.streams
        .filter((stream) => stream.type === "audio")
        .map((stream) => stream.language ?? "und")
      throw new Error(
        `No ${language} audio listed (audio: ${languages.join(", ") || "none"})`
      )
    }

    const audio = findStream(streams, listedAudio.index, "audio")
    return { language, path: outputPath, audio, aacChannels: aacChannelsOf(audio) }
  })

  return { input: entry.input, duration, video, tagHvc1, outputs }
}

/**
 * One line per output: the streams it takes and what happens to them.
 */
function describePlan({ video, tagHvc1, outputs }: SplitPlan) {
  return outputs.map(({ language, path: outputPath, audio, aacChannels }) => {
    const changes = [
      tagHvc1 ? `tag ${video.codec_tag_string} → hvc1` : "copy video",
      aacChannels
        ? `audio ${audio.codec_name} ${aacChannels}ch → aac`
        : `copy ${audio.codec_name}`
    ]
    return `${language} #${video.index}+#${audio.index} → ${path.basename(outputPath)} (${changes.join(", ")})`
  })
}

/**
 * Splits one input into a fragmented MP4 per audio language in a single ffmpeg pass (the input is read once),
 * then deletes the input.
 *
 * Every output keeps the video and one audio stream: subtitles, attachments (fonts), and chapters are dropped,
 * since an MP4 chapter list becomes an extra text track that `track.spec.ts` can't import. Each output is
 * written to a temp file next to it and renamed into place only once every output checks out (`checkRemux`);
 * the input is deleted last. On any failure the temp files are removed and the input is left untouched.
 */
async function splitFile({ input, duration, video, tagHvc1, outputs }: SplitPlan) {
  const targets = outputs.map((output) => ({
    ...output,
    temp: path.join(
      path.dirname(output.path),
      `${path.parse(output.path).name}${REMUX_SUFFIX}`
    )
  }))
  const renamed: string[] = []

  try {
    execFileSync(
      "ffmpeg",
      [
        ["-v", "error", "-y", "-i", input],
        ...targets.map(({ audio, aacChannels, temp }) => [
          ["-map", `0:${video.index}`, "-map", `0:${audio.index}`, "-map_chapters", "-1"],
          remuxArgs(tagHvc1, aacChannels),
          [temp]
        ])
      ].flat(2),
      {
        stdio: ["ignore", "ignore", "pipe"],
        maxBuffer: 1024 * 1024 * 64 // 64 Megabytes
      }
    )

    for (const { temp } of targets) await checkRemux(temp, duration)

    for (const { temp, path: outputPath } of targets) {
      await fs.promises.rename(temp, outputPath)
      renamed.push(outputPath)
    }
  } catch (error) {
    for (const { temp } of targets) await fs.promises.rm(temp, { force: true })
    for (const outputPath of renamed) await fs.promises.rm(outputPath, { force: true })
    throw error
  }

  await fs.promises.rm(input)
}

async function main() {
  const startedAt = new Date()

  const { values } = parseArgs({
    options: { "file": { type: "string" }, "dry-run": { type: "boolean" } }
  })

  const parsed = argsValidator.safeParse({ file: values.file, dryRun: values["dry-run"] })
  if (!parsed.success) {
    logger(
      `❌ Invalid arguments: ${JSON.stringify(z.flattenError(parsed.error).fieldErrors)}`
    )
    return
  }

  const missing = missingTools()
  if (missing.length > 0) throw new Error(`${missing.join(", ")} not found on the PATH`)

  const entries = entriesValidator.parse(
    JSON.parse(await fs.promises.readFile(parsed.data.file, "utf-8"))
  )
  const skipped: string[] = []
  let splitCount = 0

  for (const entry of entries) {
    const input = toStoredPath(entry.input)

    try {
      const plan = planSplit(entry)

      if (parsed.data.dryRun) {
        logger(`🔎 ${input}`)
        describePlan(plan).forEach((line) => logger(`   ${COLOR.FG.Gray}${line}`))
      } else {
        const fileStartedAt = new Date()
        await splitFile(plan)
        logger(
          `✂️ ${input} → ${plan.outputs.map((output) => path.basename(output.path)).join(", ")}`,
          fileStartedAt
        )
      }

      splitCount++
    } catch (error) {
      skipped.push(input)
      logger(`⚠️ Skipped ${input}: ${errorMessage(error)}`)
    }
  }

  if (parsed.data.dryRun) {
    logger(
      `🔎 Dry run: ${splitCount} of ${entries.length} file(s) would be split; nothing was touched`
    )
  } else {
    logger(
      `🎉 Split ${splitCount} of ${entries.length} file(s) and deleted their inputs`,
      startedAt
    )
  }

  if (skipped.length > 0)
    logger(`⚠️ ${skipped.length} file(s) skipped and kept on disk (see above)`)
}

main().catch((error) => logger(`❌ ${errorMessage(error)}`))
