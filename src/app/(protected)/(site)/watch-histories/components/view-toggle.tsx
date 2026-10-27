"use client"

import { GridViewIcon, ListViewIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useMemo } from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { HISTORY_VIEW_LABELS, HISTORY_VIEWS } from "@/constants"

import { useHistoryQuery } from "../hooks/use-history-query"

const VIEW_ICONS = { grid: GridViewIcon, list: ListViewIcon } as const

/**
 * Switches the cards between grid and list. The view is rendered on the server, so a switch is a server
 * round-trip that keeps the current page. Pressing the current view again changes nothing (Base UI would
 * empty the group).
 */
export function ViewToggle() {
  const { query, update } = useHistoryQuery()
  const value = useMemo(() => [query.view], [query.view])

  const handleChange = useCallback(
    (values: string[]) => {
      const [key] = values
      const view = HISTORY_VIEWS.find((value) => value === key)
      if (view && view !== query.view) update({ view })
    },
    [query.view, update]
  )

  return (
    <ToggleGroup
      aria-label='View'
      className='bg-foreground/5 shrink-0 gap-0.5 rounded-lg p-1'
      value={value}
      onValueChange={handleChange}>
      {HISTORY_VIEWS.map((view) => (
        <ToggleGroupItem
          key={view}
          className='hover:text-foreground aria-pressed:bg-primary/15 aria-pressed:text-primary aria-pressed:hover:bg-primary/15 size-7 min-w-0 rounded-md bg-transparent px-0 text-zinc-400 hover:bg-transparent'
          value={view}
          aria-label={HISTORY_VIEW_LABELS[view]}>
          <HugeiconsIcon icon={VIEW_ICONS[view]} strokeWidth={1.8} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
