"use client"

import { useCallback, useMemo } from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { HISTORY_STATUS_LABELS, HISTORY_STATUSES } from "@/constants"

import { useHistoryQuery } from "../hooks/use-history-query"

const ALL = "all"

const SEGMENT_CLASS =
  "h-7 rounded-md bg-transparent px-3 text-xs font-bold text-zinc-400 hover:bg-transparent hover:text-foreground aria-pressed:bg-primary/15 aria-pressed:text-primary aria-pressed:hover:bg-primary/15 aria-pressed:hover:text-primary"

/**
 * The segmented status filter: `All`, then one segment per `HISTORY_STATUSES`. `All` clears the `status`
 * param. Pressing the selected segment again changes nothing (Base UI would empty the group).
 */
export function StatusTabs() {
  const { query, update } = useHistoryQuery()
  const value = useMemo(() => [query.status ?? ALL], [query.status])

  const handleChange = useCallback(
    (values: string[]) => {
      const [key] = values
      if (!key) return
      const status = HISTORY_STATUSES.find((value) => value === key) ?? null
      if (status !== query.status) update({ status })
    },
    [query.status, update]
  )

  return (
    <ToggleGroup
      aria-label='Status'
      className='bg-foreground/5 gap-0.5 rounded-lg p-1'
      value={value}
      onValueChange={handleChange}>
      <ToggleGroupItem className={SEGMENT_CLASS} value={ALL}>
        All
      </ToggleGroupItem>
      {HISTORY_STATUSES.map((status) => (
        <ToggleGroupItem key={status} className={SEGMENT_CLASS} value={status}>
          {HISTORY_STATUS_LABELS[status]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
