"use client"

import { ToggleButton, ToggleButtonGroup, type Key } from "@heroui/react"
import {
  Film01Icon,
  Folder01Icon,
  SparklesIcon,
  Tv01Icon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { useCallback, useMemo } from "react"

import { useHistoryQuery } from "../hooks/use-history-query"
import { HISTORY_KIND_LABELS } from "../utils"
import { HISTORY_KINDS, type HistoryKind } from "../validator.zod"

const ALL = "all"

const KIND_ICONS: Record<HistoryKind, IconSvgElement> = {
  anime: Tv01Icon,
  series: Folder01Icon,
  movie: Film01Icon
}

const TAB_CLASS =
  "h-9 gap-2 rounded-lg bg-transparent px-3 font-bold text-zinc-400 data-[hovered=true]:text-foreground data-[selected=true]:bg-theme data-[selected=true]:text-background sm:px-4"

/**
 * The kind switch on the left of the toolbar: `All` first, then one tab per `HISTORY_KINDS`. Exactly one tab
 * is always selected; `All` clears the `kind` param.
 */
export function KindTabs() {
  const { query, update } = useHistoryQuery()
  const selectedKeys = useMemo(() => [query.kind ?? ALL], [query.kind])

  const handleChange = useCallback(
    (keys: Set<Key>) => {
      const [key] = keys
      const kind = HISTORY_KINDS.find((value) => value === key) ?? null
      if (kind !== query.kind) update({ kind })
    },
    [query.kind, update]
  )

  return (
    <ToggleButtonGroup
      aria-label='Kind'
      className='gap-1 overflow-x-auto'
      isDetached
      disallowEmptySelection
      selectionMode='single'
      selectedKeys={selectedKeys}
      onSelectionChange={handleChange}>
      <ToggleButton className={TAB_CLASS} id={ALL}>
        <HugeiconsIcon icon={SparklesIcon} size={18} strokeWidth={1.8} />
        All
      </ToggleButton>
      {HISTORY_KINDS.map((kind) => (
        <ToggleButton key={kind} className={TAB_CLASS} id={kind}>
          <HugeiconsIcon icon={KIND_ICONS[kind]} size={18} strokeWidth={1.8} />
          {HISTORY_KIND_LABELS[kind]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
