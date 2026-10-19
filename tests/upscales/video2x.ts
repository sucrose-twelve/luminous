import { spawnSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"

import { spawn, which } from "bun"

import { logger } from "@/libs/logger"

import {
  DURATION_TOLERANCE,
  INTERMEDIATE_ARGS,
  RIFE_MODELS,
  RIFE_UHD_FROM,
  SCENE_THRESHOLD,
  VIDEO2X_SUCCESS
} from "./constants"
import { probeDuration } from "./ffprobe"
import { logCommand } from "./utils"

export type Video2x = {
  /**
   * `null` when Video2X isn't installed: only files that need no AI step (a resize or a frame rate drop) can
   * run.
   */
  executable: string | null
  version: string | null
  /**
   * 6.4.0 has `--no-copy-streams`; newer builds split it into audio and subtitle flags.
   */
  noCopyStreams: string[]
  /**
   * The best of `RIFE_MODELS` on disk, or `null` for Video2X's default.
   */
  rifeModel: string | null
}

type StepFiles = {
  input: string
  output: string
  gpu: number
}

/**
 * Finds `video2x.exe`: `--video2x`, then the PATH, then the default install folder
 * (`%LOCALAPPDATA%\Programs\video2x`).
 *
 * @throws When `--video2x` points at a file that doesn't exist
 */
function findExecutable(explicit?: string) {
  if (explicit) {
    if (!fs.existsSync(explicit)) throw new Error(`--video2x not found: ${explicit}`)
    return explicit
  }

  const candidates = [
    which("video2x"),
    path.join(os.homedir(), "AppData", "Local", "Programs", "video2x", "video2x.exe")
  ]
  return (
    candidates.find(
      (candidate): candidate is string => !!candidate && fs.existsSync(candidate)
    ) ?? null
  )
}

/**
 * Runs Video2X with one argument and returns stdout and stderr together, whatever the exit code.
 */
function readOutput(executable: string, arg: string) {
  const result = spawnSync(executable, [arg], { encoding: "utf-8" })
  return `${result.stdout ?? ""}${result.stderr ?? ""}`
}

/**
 * Finds Video2X and reads which flags and RIFE models this install has.
 */
export function loadVideo2x(explicit?: string): Video2x {
  const executable = findExecutable(explicit)
  if (!executable) {
    return {
      executable: null,
      version: null,
      noCopyStreams: ["--no-copy-streams"],
      rifeModel: RIFE_MODELS[0]
    }
  }

  const help = readOutput(executable, "--help")
  const modelDirectory = path.join(path.dirname(executable), "models", "rife")

  return {
    executable,
    version: readOutput(executable, "--version").trim().split("\n")[0] || null,
    noCopyStreams: help.includes("--no-copy-audio-streams")
      ? ["--no-copy-audio-streams", "--no-copy-subtitle-streams"]
      : ["--no-copy-streams"],
    rifeModel:
      RIFE_MODELS.find((model) => fs.existsSync(path.join(modelDirectory, model))) ?? null
  }
}

/**
 * Video2X arguments of the upscale step: Real-ESRGAN by `factor` into a near-lossless intermediate.
 */
export function upscaleArgs(
  video2x: Video2x,
  { input, output, gpu, factor, model }: StepFiles & { factor: number; model: string }
) {
  return [
    ["-i", input, "-o", output],
    ["-p", "realesrgan", "-s", String(factor), "--realesrgan-model", model],
    ["-d", String(gpu)],
    INTERMEDIATE_ARGS,
    video2x.noCopyStreams
  ].flat()
}

/**
 * Video2X arguments of the interpolation step: RIFE by `multiplier`, repeating the frame at scene cuts instead
 * of blending across them.
 */
export function interpolateArgs(
  video2x: Video2x,
  {
    input,
    output,
    gpu,
    multiplier,
    shortSide
  }: StepFiles & { multiplier: number; shortSide: number }
) {
  return [
    ["-i", input, "-o", output],
    ["-p", "rife", "-m", String(multiplier), "-t", String(SCENE_THRESHOLD)],
    video2x.rifeModel ? ["--rife-model", video2x.rifeModel] : [],
    shortSide >= RIFE_UHD_FROM ? ["--rife-uhd"] : [],
    ["-d", String(gpu)],
    INTERMEDIATE_ARGS,
    video2x.noCopyStreams
  ].flat()
}

/**
 * Runs one Video2X step, showing its output live. With `dryRun` the command is only logged.
 *
 * Video2X 6.4.0 on Windows often crashes on shutdown (exit code 5, access violation) after the output is
 * fully written. That exit is accepted only when Video2X reported `VIDEO2X_SUCCESS` and the output covers the
 * source's duration, within `DURATION_TOLERANCE`.
 *
 * @throws When Video2X isn't installed, or it fails any other way
 */
export async function runVideo2x(
  video2x: Video2x,
  args: string[],
  { output, duration, dryRun }: { output: string; duration: number; dryRun: boolean }
) {
  logCommand([video2x.executable ?? "video2x", ...args])
  if (dryRun) return

  if (!video2x.executable) {
    throw new Error(
      "Video2X not found: install it (tests/upscales/README.md) or pass --video2x <path>"
    )
  }

  const child = spawn([video2x.executable, ...args], {
    cwd: path.dirname(video2x.executable),
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe"
  })

  /**
   * Copies each stream to the terminal as it comes, keeping the last 8 KB of both to look for
   * `VIDEO2X_SUCCESS`.
   */
  let tail = ""
  const tee = async (stream: ReadableStream<Uint8Array>, sink: NodeJS.WriteStream) => {
    const decoder = new TextDecoder()
    for await (const chunk of stream) {
      sink.write(chunk)
      tail = (tail + decoder.decode(chunk, { stream: true })).slice(-8_192)
    }
  }

  const [, , code] = await Promise.all([
    tee(child.stdout, process.stdout),
    tee(child.stderr, process.stderr),
    child.exited
  ])
  if (code === 0) return

  const written = fs.existsSync(output) ? probeDuration(output) : 0
  const tolerance = Math.max(
    DURATION_TOLERANCE.seconds,
    duration * DURATION_TOLERANCE.ratio
  )
  if (!tail.includes(VIDEO2X_SUCCESS) || written < duration - tolerance) {
    throw new Error(`video2x exited with code ${code}`)
  }

  logger(
    `⚠️ video2x crashed on exit (code ${code}) after finishing; output checked (${written.toFixed(2)}s), continuing`
  )
}
