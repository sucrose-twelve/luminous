"use server"

import { z } from "zod"

import { withRole } from "@/actions/auth"
import { ROOT_ROLES } from "@/constants"

import { clearImportJob } from "./runner"

/**
 * Hides a finished import's status card for everyone (`clearImportJob`). Root only.
 *
 * @param jobId - The job's `id`
 * @returns A `message` while the import is still running
 */
export const dismissImport = withRole(ROOT_ROLES, async (_account, jobId: unknown) => {
  const id = z.uuid().safeParse(jobId)
  if (!id.success) return { ok: true as const }

  return clearImportJob(id.data)
})
