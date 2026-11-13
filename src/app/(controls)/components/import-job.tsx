"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type { ImportEvent, ImportJob } from "@/actions/imports/runner"
import { refreshImportCache } from "@/actions/imports/update"
import { IMPORT_LOG_LIMIT, IMPORT_RUNNING_STATUSES } from "@/constants"

const ImportJobContext = createContext<ImportJob | null>(null)

/**
 * Keeps a page's import up to date from `/api/imports` (one stream per page, shared by its status card and
 * Import buttons), for root only. Once a run ends, it expires the site cache for the seasons it touched
 * (`refreshImportCache`), unless another open page already has.
 *
 * @param initial - The import when the page rendered (`readImportJob`)
 */
export function ImportJobProvider({
  initial,
  children
}: Readonly<{ initial: ImportJob | null; children: React.ReactNode }>) {
  const [job, setJob] = useState(initial)
  const refreshedJobId = useRef<string | null>(null)

  useEffect(() => {
    const source = new EventSource("/api/imports")
    source.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as ImportEvent
      if (event.type === "job") {
        setJob(event.job)
        return
      }

      setJob((current) =>
        current?.id === event.jobId
          ? { ...current, lines: [...current.lines, event.line].slice(-IMPORT_LOG_LIMIT) }
          : current
      )
    }

    return () => source.close()
  }, [])

  useEffect(() => {
    if (!job || job.isRefreshed || IMPORT_RUNNING_STATUSES.includes(job.status)) return
    if (refreshedJobId.current === job.id) return

    refreshedJobId.current = job.id
    refreshImportCache(job.id).then((result) => {
      const description = result.ok
        ? `Site cache refreshed for ${result.episodes} episodes and ${result.tracks} tracks`
        : result.message
      if (job.status === "succeeded")
        toast.success(`Imported ${job.target.name}`, { description })
      else if (job.status === "failed")
        toast.error(`${job.target.name} failed to import`, { description })
      else toast.info(`Cancelled the import of ${job.target.name}`, { description })
    })
  }, [job])

  return <ImportJobContext value={job}>{children}</ImportJobContext>
}

/**
 * The current or last import from `ImportJobProvider`, or `null` when there's none.
 */
export function useImportJob() {
  return useContext(ImportJobContext)
}
