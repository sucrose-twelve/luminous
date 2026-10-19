import path from "path"

import { spawn } from "bun"
import { formatDuration, intervalToDuration } from "date-fns"

import { COLOR, logger } from "@/libs/logger"

/**
 * Resolves a path, accepting Git Bash's `/d/Workspace/media` for `D:/Workspace/media` so the same command works
 * from PowerShell and cmd.
 */
export function toNativePath(filePath: string) {
  const drive =
    process.platform === "win32" ? /^\/([a-zA-Z])(\/.*)?$/.exec(filePath) : null
  return path.resolve(drive ? `${drive[1].toUpperCase()}:${drive[2] ?? "/"}` : filePath)
}

/**
 * Reads an ffprobe frame rate fraction (`30000/1001`) as a number, or `0` when it's missing or `0/0`.
 */
export function parseRate(rate?: string) {
  const [numerator, denominator] = (rate ?? "0/0").split("/").map(Number)
  return numerator && denominator ? numerator / denominator : 0
}

/**
 * A frame rate for a log line: `30`, `59.94`.
 */
export function formatFps(fps: number) {
  return Number.isInteger(fps) ? String(fps) : fps.toFixed(2)
}

/**
 * A video length for a log line: `23 minutes 40 seconds`. ffprobe reports `0` for a container without a
 * duration, which `formatDuration` would print as an empty string.
 */
export function formatLength(seconds: number) {
  const end = Math.round(seconds) * 1_000
  return formatDuration(intervalToDuration({ start: 0, end })) || "unknown length"
}

/**
 * Quotes an argument of a logged command, so the line can be copied into a shell as is.
 */
function quoteArg(arg: string) {
  return /[\s"'(),;]/.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg
}

/**
 * Logs a command in gray, the way `--dry-run` shows the plan.
 */
export function logCommand(command: string[]) {
  logger(`   ${COLOR.FG.Gray}$ ${command.map(quoteArg).join(" ")}`)
}

/**
 * Logs a command, then runs it with the terminal attached so its progress shows live. With `dryRun` it is
 * only logged.
 *
 * @throws When the command exits with a non-zero code
 */
export async function runCommand(command: string[], dryRun: boolean) {
  logCommand(command)
  if (dryRun) return

  const code = await spawn(command, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit"
  }).exited
  if (code !== 0)
    throw new Error(`${path.parse(command[0]).name} exited with code ${code}`)
}
