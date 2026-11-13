"use client"

import {
  Alert02Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  StopCircleIcon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { format } from "date-fns"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { dismissImport } from "@/actions/imports/delete"
import type { ImportJob } from "@/actions/imports/runner"
import { cancelImport } from "@/actions/imports/update"
import { formatElapsed } from "@/app/(controls)/utils"
import { Link } from "@/components/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  IMPORT_FLAGS,
  IMPORT_RUNNING_STATUSES,
  IMPORT_STATUS_LABELS,
  type ImportStatus
} from "@/constants"
import { cls } from "@/libs/utils"

import { useImportJob } from "./import-job"

const STATUS_TONES: Record<ImportStatus, string> = {
  running: "bg-sky-500/15 text-sky-300",
  cancelling: "bg-amber-500/15 text-amber-300",
  succeeded: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
  cancelled: "bg-zinc-500/15 text-zinc-400"
}

/**
 * The icon of a finished import; a running one shows a spinner instead.
 */
const STATUS_ICONS: Record<ImportStatus, IconSvgElement> = {
  running: CheckmarkCircle02Icon,
  cancelling: StopCircleIcon,
  succeeded: CheckmarkCircle02Icon,
  failed: Alert02Icon,
  cancelled: StopCircleIcon
}

/**
 * Pixels from the bottom within which the log still follows new lines; scrolling further up stops it.
 */
const FOLLOW_THRESHOLD = 24

/**
 * The current or last import (`useImportJob`), above a page's table: what it imports, its status, how long it
 * has run, Cancel or Dismiss, and its log, which follows new lines while scrolled to the bottom. Nothing when
 * there's no import.
 */
export function ImportStatusCard() {
  const job = useImportJob()
  return job ? <ImportCard key={job.id} job={job} /> : null
}

function ImportCard({ job }: Readonly<{ job: ImportJob }>) {
  const isRunning = IMPORT_RUNNING_STATUSES.includes(job.status)
  const [now, setNow] = useState(() => Date.now())
  const [isLogOpen, setLogOpen] = useState(true)
  const [isPending, startTransition] = useTransition()
  const logRef = useRef<HTMLPreElement>(null)
  const isFollowing = useRef(true)

  useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isRunning])

  useEffect(() => {
    const log = logRef.current
    if (log && isFollowing.current) log.scrollTop = log.scrollHeight
  }, [job.lines.length, isLogOpen])

  const handleScroll = useCallback(() => {
    const log = logRef.current
    if (log) {
      isFollowing.current =
        log.scrollHeight - log.scrollTop - log.clientHeight < FOLLOW_THRESHOLD
    }
  }, [])

  const handleCancel = useCallback(() => {
    startTransition(async () => {
      const result = await cancelImport(job.id)
      if (!result.ok) toast.error(result.message)
    })
  }, [job.id])

  const handleDismiss = useCallback(() => {
    startTransition(async () => {
      const result = await dismissImport(job.id)
      if (!result.ok) toast.error(result.message)
    })
  }, [job.id])

  const toggleLog = useCallback(() => setLogOpen((isOpen) => !isOpen), [])

  const flags = IMPORT_FLAGS.filter((item) => job.flags.includes(item.key))
  const elapsed = formatElapsed((job.finishedAt ?? now) - job.startedAt)

  return (
    <section aria-label='Import' className='flex flex-col rounded-2xl bg-zinc-900/60'>
      <div className='flex items-start gap-4 px-5 py-4'>
        <div
          className={cls(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            STATUS_TONES[job.status]
          )}>
          {isRunning ? (
            <Spinner className='size-5' />
          ) : (
            <HugeiconsIcon icon={STATUS_ICONS[job.status]} size={20} strokeWidth={1.8} />
          )}
        </div>

        <div className='flex min-w-0 grow flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-medium tracking-wide text-zinc-500 uppercase'>
              Import
            </span>
            <Badge className={STATUS_TONES[job.status]}>
              {IMPORT_STATUS_LABELS[job.status]}
            </Badge>
            {flags.map((item) => (
              <Badge key={item.key} variant='outline' className='font-mono'>
                {item.flag}
              </Badge>
            ))}
          </div>
          {job.target.type === "season" ? (
            <Link
              href={`/ctrl/seasons/${job.target.seasonId}`}
              className='truncate font-medium hover:underline'>
              {job.target.name}
            </Link>
          ) : (
            <p className='truncate font-medium'>
              {job.target.name}{" "}
              <span className='text-sm font-normal text-zinc-400'>
                · {job.seasonIds.length} seasons
              </span>
            </p>
          )}
          <p className='text-xs text-zinc-400' suppressHydrationWarning>
            {job.startedBy} · started {format(job.startedAt, "p")} · {elapsed}
            {job.status === "cancelling" ? " · stops after the current file" : ""}
          </p>
        </div>

        {isRunning ? (
          <Button
            variant='outline'
            disabled={isPending || job.status === "cancelling"}
            onClick={handleCancel}>
            <HugeiconsIcon
              icon={StopCircleIcon}
              strokeWidth={2}
              data-icon='inline-start'
            />
            Cancel
          </Button>
        ) : (
          <Button variant='ghost' disabled={isPending} onClick={handleDismiss}>
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} data-icon='inline-start' />
            Dismiss
          </Button>
        )}
      </div>

      {job.error ? <p className='px-5 pb-3 text-sm text-red-300'>{job.error}</p> : null}

      <div className='border-t border-white/5'>
        <button
          type='button'
          aria-expanded={isLogOpen}
          onClick={toggleLog}
          className='flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left text-xs text-zinc-400 transition-colors hover:text-white'>
          <span className='shrink-0 font-medium'>Log · {job.lines.length} lines</span>
          {isLogOpen ? null : (
            <code className='min-w-0 grow truncate font-mono text-zinc-500'>
              {job.lines.at(-1)}
            </code>
          )}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={16}
            className={cls(
              "ml-auto shrink-0 transition-transform",
              isLogOpen && "rotate-180"
            )}
          />
        </button>
        {isLogOpen ? (
          <pre
            ref={logRef}
            onScroll={handleScroll}
            className='max-h-72 overflow-auto px-5 pb-4 font-mono text-xs leading-5 break-all whitespace-pre-wrap text-zinc-300'>
            {job.lines.length > 0 ? job.lines.join("\n") : "Starting…"}
          </pre>
        ) : null}
      </div>
    </section>
  )
}
