/**
 * Runs `tests/track.spec.ts` for the control panel's Import, one run at a time, and keeps its state and log for
 * the status card. No `"use server"`: helpers for the import actions and `/api/imports`, never endpoints.
 *
 * The state lives in this process's memory on purpose: the run is this process's child, so a restart ends both,
 * and nothing is left claiming a run that no longer exists. It sits on `globalThis` so every bundle (Server
 * Actions, the Route Handler, dev reloads) shares one.
 */
import { spawn, type ChildProcess } from "node:child_process"
import { randomUUID } from "node:crypto"
import { EventEmitter } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import readline from "node:readline"

import {
  IMPORT_EXIT_CODES,
  IMPORT_FLAGS,
  IMPORT_LOG_LIMIT,
  IMPORT_RUNNING_STATUSES,
  type ImportFlag,
  type ImportStatus
} from "@/constants"

export type ImportTarget =
  | { type: "season"; seasonId: string; name: string }
  | { type: "ongoing"; kind: Content.Kind; name: string }

export type ImportJob = {
  id: string
  target: ImportTarget
  flags: ImportFlag[]
  /**
   * The seasons the run may touch: their caches expire once it ends.
   */
  seasonIds: string[]
  status: ImportStatus
  startedBy: string
  startedAt: number
  finishedAt: number | null
  /**
   * The newest `IMPORT_LOG_LIMIT` lines of the run's output, without colours or `logger`'s date.
   */
  lines: string[]
  /**
   * Why the run ended without its own summary, e.g. `bun` isn't in the PATH.
   */
  error: string | null
  /**
   * Whether `refreshImportCache` has expired the site cache for this run.
   */
  isRefreshed: boolean
}

/**
 * What `/api/imports` streams: the whole job when it starts, changes status, or goes, then each new log line.
 */
export type ImportEvent =
  { type: "job"; job: ImportJob | null } | { type: "line"; jobId: string; line: string }

type ImportState = {
  job: ImportJob | null
  child: ChildProcess | null
  events: EventEmitter
}

declare global {
  var luminousImport: ImportState | undefined
}

const state: ImportState = (globalThis.luminousImport ??= {
  job: null,
  child: null,
  /**
   * One listener per open status card, so no listener limit.
   */
  events: new EventEmitter().setMaxListeners(0)
})

const ANSI_PATTERN = /\x1b\[[0-9;?]*[A-Za-z]/g

/**
 * `logger`'s `[LUMINOUS] — Nov 13, 2026, 1:13:05 PM` prefix: the card keeps only the time.
 */
const LOGGER_PREFIX = /^\[LUMINOUS\] — .+?, \d{4}, (\d{1,2}:\d{2}:\d{2} [AP]M)\s+/

export function currentImport() {
  return state.job
}

/**
 * Calls `listener` with every `ImportEvent` until the returned function is called.
 */
export function subscribeImport(listener: (event: ImportEvent) => void) {
  state.events.on("event", listener)
  return () => {
    state.events.off("event", listener)
  }
}

function emit(event: ImportEvent) {
  state.events.emit("event", event)
}

function cancelFilePath(jobId: string) {
  return path.join(os.tmpdir(), `luminous-import-${jobId}.cancel`)
}

function pushLine(job: ImportJob, raw: string) {
  const line = raw.replace(ANSI_PATTERN, "").replace(LOGGER_PREFIX, "$1  ").trimEnd()
  if (!line) return

  job.lines.push(line)
  if (job.lines.length > IMPORT_LOG_LIMIT)
    job.lines.splice(0, job.lines.length - IMPORT_LOG_LIMIT)
  emit({ type: "line", jobId: job.id, line })
}

function finish(job: ImportJob, status: ImportStatus, error: string | null = null) {
  if (job.finishedAt !== null) return

  job.status = status
  job.finishedAt = Date.now()
  job.error = error
  if (state.job === job) state.child = null
  fs.promises.rm(cancelFilePath(job.id), { force: true }).catch(() => undefined)
  emit({ type: "job", job: state.job })
}

/**
 * Starts `bun tests/track.spec.ts` for a season, or for every ongoing season of a kind, from the project folder.
 * It exits with `IMPORT_EXIT_CODES` when it doesn't succeed, which sets the job's final status.
 *
 * @returns The new job, or a `message` while another run is still going
 */
export function startImportJob({
  target,
  flags,
  seasonIds,
  startedBy
}: Pick<ImportJob, "target" | "flags" | "seasonIds" | "startedBy">) {
  if (state.job && IMPORT_RUNNING_STATUSES.includes(state.job.status)) {
    return { ok: false as const, message: `${state.job.target.name} is still importing` }
  }

  const job: ImportJob = {
    id: randomUUID(),
    target,
    flags,
    seasonIds,
    status: "running",
    startedBy,
    startedAt: Date.now(),
    finishedAt: null,
    lines: [],
    error: null,
    isRefreshed: false
  }
  const args = [
    "tests/track.spec.ts",
    ...(target.type === "season"
      ? ["--season", target.seasonId]
      : ["--kind", target.kind]),
    ...IMPORT_FLAGS.filter((item) => flags.includes(item.key)).map((item) => item.flag),
    "--cancel-file",
    cancelFilePath(job.id)
  ]

  /**
   * `next dev` runs on Node, so `bun` comes from the PATH; under Bun, its own executable.
   */
  const child = spawn(process.versions.bun ? process.execPath : "bun", args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  })
  state.job = job
  state.child = child

  readline
    .createInterface({ input: child.stdout })
    .on("line", (line) => pushLine(job, line))
  readline
    .createInterface({ input: child.stderr })
    .on("line", (line) => pushLine(job, line))
  child.on("error", (error) =>
    finish(job, "failed", `The import couldn't start: ${error.message}`)
  )
  child.on("close", (code) => {
    if (code === 0) finish(job, "succeeded")
    else if (code === IMPORT_EXIT_CODES.cancelled) finish(job, "cancelled")
    else
      finish(
        job,
        "failed",
        code === IMPORT_EXIT_CODES.failed ? null : `Exited with ${code}`
      )
  })

  emit({ type: "job", job })
  return { ok: true as const, job }
}

/**
 * Asks the running job to stop: creates its cancel file, and the script stops at its next safe point (between
 * files), so a remux is never cut off midway.
 *
 * @returns A `message` when there's no such job running
 */
export async function cancelImportJob(jobId: string) {
  const job = state.job
  if (!job || job.id !== jobId || job.status !== "running") {
    return { ok: false as const, message: "That import isn't running" }
  }

  await fs.promises.writeFile(cancelFilePath(job.id), "")
  job.status = "cancelling"
  emit({ type: "job", job })
  return { ok: true as const }
}

/**
 * Notes that the site cache was expired for a finished job, so other open cards don't expire it again.
 */
export function markImportRefreshed(jobId: string) {
  const job = state.job
  if (!job || job.id !== jobId) return

  job.isRefreshed = true
  emit({ type: "job", job })
}

/**
 * Removes a finished job, which hides the status card.
 *
 * @returns A `message` when the job is still running
 */
export function clearImportJob(jobId: string) {
  const job = state.job
  if (!job || job.id !== jobId) return { ok: true as const }
  if (IMPORT_RUNNING_STATUSES.includes(job.status)) {
    return { ok: false as const, message: "Cancel the import before dismissing it" }
  }

  state.job = null
  emit({ type: "job", job: null })
  return { ok: true as const }
}
