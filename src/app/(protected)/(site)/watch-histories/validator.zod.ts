import { z } from "zod"

import { HISTORY_KINDS, HISTORY_SORTS, HISTORY_STATUSES } from "@/constants"

export const historyValidator = z.object({
  page: z.int().min(1).default(1),
  kind: z.enum(HISTORY_KINDS).nullish(),
  status: z.enum(HISTORY_STATUSES).nullish(),
  sort: z.enum(HISTORY_SORTS).default("recent")
})

export type HistoryValidator = z.infer<typeof historyValidator>

export const deleteValidator = z.object({ id: z.uuid() })

export type DeleteValidator = z.infer<typeof deleteValidator>
