"use server"

import { z } from "zod"

import { withRole } from "@/actions/auth"
import { expireSeasonCaches } from "@/actions/contents/cache"
import { IMPORT_RUNNING_STATUSES, ROOT_ROLES } from "@/constants"

import { cancelImportJob, currentImport, markImportRefreshed } from "./runner"

/**
 * Asks the running import to stop at its next safe point (`cancelImportJob`). Root only.
 *
 * @param jobId - The job's `id`
 * @returns A `message` when that import isn't running
 */
export const cancelImport = withRole(ROOT_ROLES, async (_account, jobId: unknown) => {
  const id = z.uuid().safeParse(jobId)
  if (!id.success) return { ok: false as const, message: "That import isn't running" }

  return cancelImportJob(id.data)
})

/**
 * Expires the site cache for every season a finished import may have touched (`expireSeasonCaches`), even a
 * failed or cancelled one, which can have imported some. The status card calls it once the run ends. Root only.
 *
 * @param jobId - The job's `id`
 * @returns How many episodes and tracks were refreshed, or a `message` when the job is gone or still running
 */
export const refreshImportCache = withRole(
  ROOT_ROLES,
  async (_account, jobId: unknown) => {
    const job = currentImport()
    if (!job || job.id !== jobId)
      return { ok: false as const, message: "Import not found" }
    if (IMPORT_RUNNING_STATUSES.includes(job.status)) {
      return { ok: false as const, message: "The import is still running" }
    }

    const { episodes, tracks } = await expireSeasonCaches(job.seasonIds)
    markImportRefreshed(job.id)
    return { ok: true as const, episodes, tracks }
  }
)
