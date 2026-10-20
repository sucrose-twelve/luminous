import { z } from "zod"

/**
 * Kind tabs for the URL; each one matches one or more `contents.kind` (see `HISTORY_KIND_FILTERS`).
 */
export const HISTORY_KINDS = ["anime", "series", "movie"] as const

/**
 * The statuses the page derives from a history row: `completed` is the whole content, not one episode.
 */
export const HISTORY_STATUSES = [
  "watching",
  "completed",
  "on_hold"
] as const satisfies readonly Content.WatchStatus[]

export const HISTORY_SORTS = ["recent", "oldest", "title"] as const

export const HISTORY_VIEWS = ["grid", "list"] as const

export const HISTORY_PAGE_SIZE = 24

export type HistoryKind = (typeof HISTORY_KINDS)[number]

export type HistoryStatus = (typeof HISTORY_STATUSES)[number]

export type HistorySort = (typeof HISTORY_SORTS)[number]

export type HistoryView = (typeof HISTORY_VIEWS)[number]

export const historyValidator = z.object({
  page: z.int().min(1).default(1),
  kind: z.enum(HISTORY_KINDS).nullish(),
  status: z.enum(HISTORY_STATUSES).nullish(),
  sort: z.enum(HISTORY_SORTS).default("recent")
})

export type HistoryValidator = z.infer<typeof historyValidator>

export const deleteValidator = z.object({ id: z.uuid() })

export type DeleteValidator = z.infer<typeof deleteValidator>
