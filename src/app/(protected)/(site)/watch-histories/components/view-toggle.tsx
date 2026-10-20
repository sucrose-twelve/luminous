"use client"

import { ToggleButton, ToggleButtonGroup, type Key } from "@heroui/react"
import { GridViewIcon, ListViewIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useMemo } from "react"

import { useHistoryQuery } from "../hooks/use-history-query"
import { HISTORY_VIEW_LABELS } from "../utils"
import { HISTORY_VIEWS } from "../validator.zod"

const VIEW_ICONS = { grid: GridViewIcon, list: ListViewIcon } as const

/**
 * Switches the cards between grid and list. The view is rendered on the server, so a switch is a server
 * round-trip that keeps the current page.
 */
export function ViewToggle() {
  const { query, update } = useHistoryQuery()
  const selectedKeys = useMemo(() => [query.view], [query.view])

  const handleChange = useCallback(
    (keys: Set<Key>) => {
      const [key] = keys
      const view = HISTORY_VIEWS.find((value) => value === key)
      if (view && view !== query.view) update({ view })
    },
    [query.view, update]
  )

  return (
    <ToggleButtonGroup
      aria-label='View'
      className='bg-foreground/5 shrink-0 gap-0.5 rounded-lg p-1'
      isDetached
      disallowEmptySelection
      selectionMode='single'
      selectedKeys={selectedKeys}
      onSelectionChange={handleChange}>
      {HISTORY_VIEWS.map((view) => (
        <ToggleButton
          key={view}
          className='data-[hovered=true]:text-foreground data-[selected=true]:bg-theme/15 data-[selected=true]:text-theme size-7 min-w-0 rounded-md bg-transparent text-zinc-400'
          id={view}
          isIconOnly
          aria-label={HISTORY_VIEW_LABELS[view]}>
          <HugeiconsIcon icon={VIEW_ICONS[view]} size={16} strokeWidth={1.8} />
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
