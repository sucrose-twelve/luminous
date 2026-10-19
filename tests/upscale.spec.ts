import fs from "fs"
import path from "path"
import { parseArgs } from "util"

import { z } from "zod"

import { COLOR, logger } from "@/libs/logger"

import { missingTools } from "./tracks/ffmpeg"
import { errorMessage } from "./tracks/utils"
import {
  MAX_AI_FACTOR,
  PARTIAL_FILE,
  UPSCALE_MODELS,
  WORK_FOLDER
} from "./upscales/constants"
import {
  encodeCommand,
  encodeFilters,
  findEncoder,
  type Encoder
} from "./upscales/ffmpeg"
import { probeVideo, type VideoInfo } from "./upscales/ffprobe"
import { isPlanEmpty, planUpscale, type UpscalePlan } from "./upscales/plan"
import { findVideos, outputPath } from "./upscales/source"
import { formatFps, formatLength, runCommand } from "./upscales/utils"
import { argsValidator, type ArgsValidator } from "./upscales/validator.zod"
import {
  interpolateArgs,
  loadVideo2x,
  runVideo2x,
  upscaleArgs,
  type Video2x
} from "./upscales/video2x"

type Job = {
  args: ArgsValidator
  outDir: string
  video2x: Video2x
  encoder: Encoder
}

type Outcome = "done" | "skipped"

/**
 * One file's run: its source, what it was probed as, its plan, and its work folder.
 */
type Step = {
  job: Job
  input: string
  info: VideoInfo
  plan: UpscalePlan
  work: string
}

/**
 * Checks the tools and the input folder, and finds Video2X and the encoder, before any file is touched.
 */
async function loadJob(args: ArgsValidator): Promise<Job> {
  const missing = missingTools()
  if (missing.length > 0) throw new Error(`${missing.join(", ")} not found on the PATH`)

  const stats = await fs.promises.stat(args.dir).catch(() => null)
  if (!stats?.isDirectory()) throw new Error(`Folder not found: ${args.dir}`)

  return {
    args,
    outDir: args.out ?? path.join(args.dir, "upscaled"),
    video2x: loadVideo2x(args.video2x),
    encoder: findEncoder()
  }
}

/**
 * Logs the run's settings once, before the first file.
 */
function logJob({ args, outDir, video2x, encoder }: Job, count: number) {
  if (args.dryRun) logger("🔎 Dry run: commands are only printed, nothing is written")
  logger(`📂 ${args.dir} (${count} video(s)) → ${outDir}`)
  logger(
    `🎯 ${args.scale}p @ ${args.frame}fps, content ${args.content}, gpu ${args.gpu}, encoder ${encoder.name}`
  )
  logger(
    video2x.executable
      ? `🤖 ${video2x.executable} ${COLOR.FG.Gray}${video2x.version ?? ""}`
      : "⚠️ Video2X not found: only files that need no AI step (resize, frame rate drop) can run"
  )
}

/**
 * Step 1: Real-ESRGAN upscale into a near-lossless intermediate.
 *
 * @returns The intermediate, the next step's input
 */
async function upscaleStep(
  current: string,
  factor: number,
  { job, info, plan, work }: Step
) {
  const { model } = UPSCALE_MODELS[job.args.content]
  const output = path.join(work, "1-upscale.mkv")
  logger(`🔼 Upscale x${factor} (${model}) → ${plan.aiShortSide}p`)

  await runVideo2x(
    job.video2x,
    upscaleArgs(job.video2x, {
      input: current,
      output,
      gpu: job.args.gpu,
      factor,
      model
    }),
    { output, duration: info.duration, dryRun: job.args.dryRun }
  )
  return output
}

/**
 * Step 2: RIFE frame interpolation into a near-lossless intermediate.
 *
 * @returns The intermediate, the next step's input
 */
async function interpolateStep(
  current: string,
  multiplier: number,
  { job, info, plan, work }: Step
) {
  const output = path.join(work, "2-interpolate.mkv")
  logger(
    `🎞️ Interpolate x${multiplier} (${job.video2x.rifeModel ?? "rife default"}) → ${formatFps(plan.aiFps)}fps`
  )

  await runVideo2x(
    job.video2x,
    interpolateArgs(job.video2x, {
      input: current,
      output,
      gpu: job.args.gpu,
      multiplier,
      shortSide: plan.aiShortSide
    }),
    { output, duration: info.duration, dryRun: job.args.dryRun }
  )
  return output
}

/**
 * Step 3: the final HEVC encode with the source's audio, written to `PARTIAL_FILE` and renamed over `output`
 * only once ffmpeg succeeds, so a crash never leaves half a file at the real path.
 */
async function encodeStep(
  current: string,
  output: string,
  { job, input, info, plan, work }: Step
) {
  const filters = encodeFilters(plan, job.args.scale)
  const partial = path.join(work, PARTIAL_FILE)
  const filterNames = filters.map((filter) => filter.split("=")[0]).join(" + ")
  logger(`📦 Encode ${job.encoder.name}${filterNames ? ` (${filterNames})` : ""}`)

  await runCommand(
    encodeCommand({
      source: input,
      video: current,
      audioCodecs: info.audioCodecs,
      filters,
      encoder: job.encoder,
      output: partial
    }),
    job.args.dryRun
  )

  if (job.args.dryRun) return
  await fs.promises.rm(output, { force: true })
  await fs.promises.rename(partial, output)
}

/**
 * Runs only the steps one video needs, each into `<out>/.work/<name>/`, which is removed whatever happens.
 *
 * Upscaling runs before interpolation since Real-ESRGAN is by far the slowest step: run first, it only sees the
 * source's frames, not twice as many.
 */
async function upscaleFile(input: string, job: Job): Promise<Outcome> {
  const { args, outDir } = job
  const output = outputPath(input, outDir, args)

  if (fs.existsSync(output) && !args.overwrite) {
    logger(`⏭️ Skipped: ${path.basename(output)} exists, use --overwrite to redo`)
    return "skipped"
  }

  const info = probeVideo(input)
  const plan = planUpscale(info, args)
  const shortSide = Math.min(info.width, info.height)

  logger(
    `   ${COLOR.FG.Gray}source ${info.width}x${info.height} @ ${formatFps(info.fps)}fps, ${formatLength(info.duration)}, audio ${info.audioCodecs.join(", ") || "none"}`
  )
  logger(
    `   ${COLOR.FG.Gray}target ${args.scale}p @ ${args.frame}fps → ${path.basename(output)}`
  )

  if (isPlanEmpty(plan)) {
    logger("⏭️ Skipped: the source already matches the target")
    return "skipped"
  }
  if (args.scale / shortSide > MAX_AI_FACTOR) {
    logger(
      `⚠️ ${shortSide}p → ${args.scale}p is ${(args.scale / shortSide).toFixed(1)}x; AI tops out at ${MAX_AI_FACTOR}x, the rest is plain resizing`
    )
  }
  if (info.rotation && (plan.factor || plan.multiplier)) {
    logger(
      `⚠️ The video has ${info.rotation}° rotation metadata; check the output orientation`
    )
  }

  const work = path.join(outDir, WORK_FOLDER, path.parse(input).name)
  const step: Step = { job, input, info, plan, work }
  if (!args.dryRun) await fs.promises.mkdir(work, { recursive: true })

  try {
    let current = input
    if (plan.factor) current = await upscaleStep(current, plan.factor, step)
    if (plan.multiplier) current = await interpolateStep(current, plan.multiplier, step)
    await encodeStep(current, output, step)
    return "done"
  } finally {
    if (!args.dryRun) await fs.promises.rm(work, { recursive: true, force: true })
  }
}

/**
 * Upscales and/or frame-interpolates every video in a folder with Video2X 6.x, then encodes it to HEVC 10-bit
 * with FFmpeg. See `tests/upscales/README.md` for installing Video2X, speeds, and known issues.
 *
 * Usage (from the repo root):
 * ```bash
 * bun tests/upscale.spec.ts --dir /d/Workspace/media --scale 1080p --frame 60
 * bun tests/upscale.spec.ts --dir D:/Workspace/media --scale 2160p --frame 60 --content anime --dry-run
 * ```
 *
 * Per file, only the steps it needs run:
 * 1. Video2X + Real-ESRGAN upscale (2x/3x/4x) when the source is below `--scale`
 * 2. Video2X + RIFE interpolation (x2/x3) when the source is below `--frame`, repeating frames at scene cuts
 * 3. FFmpeg resize + fps + HEVC 10-bit encode (NVENC, or libx265 without it), audio from the source
 *
 * - `--scale` counts the short side (720p | 1080p | 1440p | 2160p, or 2k | 4k), so portrait videos work too.
 * - `--content real` (default) uses realesrgan-plus for live action; `anime` uses realesr-animevideov3, much
 *   faster.
 * - `--out` defaults to `<dir>/upscaled`; results are named `<name>_1080p_60fps.mp4`, and an existing one is
 *   skipped unless `--overwrite`.
 * - `--gpu` picks the Vulkan GPU (`video2x -l` lists them); `--video2x` points at `video2x.exe` when it isn't
 *   on the PATH or in `%LOCALAPPDATA%\Programs\video2x`.
 *
 * A failed file is logged and the run moves on to the next; the exit code is 1 when any file failed.
 */
async function main() {
  const startedAt = new Date()

  const { values } = parseArgs({
    options: {
      "dir": { type: "string" },
      "out": { type: "string" },
      "scale": { type: "string" },
      "frame": { type: "string" },
      "content": { type: "string" },
      "gpu": { type: "string" },
      "video2x": { type: "string" },
      "overwrite": { type: "boolean" },
      "dry-run": { type: "boolean" }
    }
  })

  const parsed = argsValidator.safeParse({ ...values, dryRun: values["dry-run"] })
  if (!parsed.success) {
    logger(
      `❌ Invalid arguments: ${JSON.stringify(z.flattenError(parsed.error).fieldErrors)}`
    )
    process.exitCode = 1
    return
  }

  const job = await loadJob(parsed.data)
  const files = await findVideos(job.args.dir)
  logJob(job, files.length)

  if (files.length === 0) {
    logger("⚠️ No video files found")
    return
  }

  const counts: Record<Outcome | "failed", number> = { done: 0, skipped: 0, failed: 0 }

  for (const [index, file] of files.entries()) {
    const fileStartedAt = new Date()
    logger(`🎬 ${index + 1}/${files.length} ${COLOR.FG.Cyan}${path.basename(file)}`)

    try {
      const outcome = await upscaleFile(file, job)
      counts[outcome]++
      if (outcome === "done") logger(`✅ Done ${path.basename(file)}`, fileStartedAt)
    } catch (error) {
      counts.failed++
      logger(`❌ Failed ${path.basename(file)}: ${errorMessage(error)}`)
    }
  }

  if (!job.args.dryRun) {
    await fs.promises.rm(path.join(job.outDir, WORK_FOLDER), {
      recursive: true,
      force: true
    })
  }

  logger(
    `🎉 ${counts.done} done, ${counts.skipped} skipped, ${counts.failed} failed`,
    startedAt
  )
  if (counts.failed > 0) process.exitCode = 1
}

main().catch((error) => {
  logger(`❌ ${errorMessage(error)}`)
  process.exitCode = 1
})
