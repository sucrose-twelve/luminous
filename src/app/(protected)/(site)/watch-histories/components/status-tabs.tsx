"use client"

import { ToggleButton, ToggleButtonGroup, type Key } from "@heroui/react"
import { useCallback, useMemo } from "react"

import { HISTORY_STATUS_LABELS, HISTORY_STATUSES } from "@/constants"

import { useHistoryQuery } from "../hooks/use-history-query"

const ALL = "all"

const SEGMENT_CLASS =
  "h-7 rounded-md bg-transparent px-3 text-xs font-bold text-zinc-400 data-[hovered=true]:text-foreground data-[selected=true]:bg-theme/15 data-[selected=true]:text-theme"

/**
 * The segmented status filter: `All`, then one segment per `HISTORY_STATUSES`. `All` clears the `status`
 * param.
 */
export function StatusTabs() {
  const { query, update } = useHistoryQuery()
  const selectedKeys = useMemo(() => [query.status ?? ALL], [query.status])

  const handleChange = useCallback(
    (keys: Set<Key>) => {
      const [key] = keys
      const status = HISTORY_STATUSES.find((value) => value === key) ?? null
      if (status !== query.status) update({ status })
    },
    [query.status, update]
  )

  return (
    <ToggleButtonGroup
      aria-label='Status'
      className='bg-foreground/5 gap-0.5 rounded-lg p-1'
      isDetached
      disallowEmptySelection
      selectionMode='single'
      selectedKeys={selectedKeys}
      onSelectionChange={handleChange}>
      <ToggleButton className={SEGMENT_CLASS} id={ALL}>
        All
      </ToggleButton>
      {HISTORY_STATUSES.map((status) => (
        <ToggleButton key={status} className={SEGMENT_CLASS} id={status}>
          {HISTORY_STATUS_LABELS[status]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
