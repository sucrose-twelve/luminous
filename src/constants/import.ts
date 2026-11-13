/**
 * The seasons an import without a season takes (`tests/track.spec.ts` with no `--season`, and the control
 * panel's Import ongoing): the ones still getting new episodes.
 */
export const ONGOING_STATUSES: Content.SeasonStatus[] = ["upcoming", "airing"]

/**
 * How `tests/track.spec.ts` exits when a run doesn't succeed, so the control panel can tell how it ended. `0`
 * is success, including a run with nothing to import.
 */
export const IMPORT_EXIT_CODES = { failed: 1, cancelled: 2 } as const

export const IMPORT_FLAG_KEYS = ["remux", "force"] as const

export type ImportFlag = (typeof IMPORT_FLAG_KEYS)[number]

/**
 * The flags `tests/track.spec.ts` takes, unticked by default: both change files on disk, so they're opted into
 * per run.
 */
export const IMPORT_FLAGS: readonly {
  key: ImportFlag
  flag: string
  label: string
  description: string
}[] = [
  {
    key: "remux",
    flag: "--remux",
    label: "Remux",
    description:
      "Rewrite source files as fragmented MP4. Only needed for files that aren't yet."
  },
  {
    key: "force",
    flag: "--force",
    label: "Force",
    description:
      "Regenerate every thumbnail and sprite sheet. Replaces thumbnails picked by hand."
  }
]

export const IMPORT_STATUSES = [
  "running",
  "cancelling",
  "succeeded",
  "failed",
  "cancelled"
] as const

export type ImportStatus = (typeof IMPORT_STATUSES)[number]

/**
 * An import in these statuses still has its process: it can't be dismissed or started again.
 */
export const IMPORT_RUNNING_STATUSES: readonly ImportStatus[] = ["running", "cancelling"]

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  running: "Running",
  cancelling: "Cancelling",
  succeeded: "Done",
  failed: "Failed",
  cancelled: "Cancelled"
}

/**
 * Log lines an import keeps for the status card: the newest ones, enough for a long season.
 */
export const IMPORT_LOG_LIMIT = 1000
