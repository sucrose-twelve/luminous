"use client"

import { ToggleButton, ToggleButtonGroup, type Key } from "@heroui/react"
import {
  FavouriteIcon,
  Film01Icon,
  FireIcon,
  Folder01Icon,
  SparklesIcon,
  Tv01Icon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { useCallback, useMemo } from "react"

import {
  HISTORY_ADULT_KINDS,
  HISTORY_GENERAL_KINDS,
  HISTORY_KIND_LABELS,
  HISTORY_KINDS,
  type HistoryKind
} from "@/constants"

import { useHistoryQuery } from "../hooks/use-history-query"

const ALL = "all"

const KIND_ICONS: Record<HistoryKind, IconSvgElement> = {
  anime: Tv01Icon,
  movie: Film01Icon,
  series: Folder01Icon,
  anime_ecchi: FavouriteIcon,
  movie_adult: FireIcon
}

const TAB_CLASS =
  "group h-9 min-w-9 gap-2 rounded-lg bg-transparent px-0 font-bold text-zinc-400 data-[hovered=true]:text-foreground data-[selected=true]:bg-theme data-[selected=true]:px-3 data-[selected=true]:text-background sm:data-[selected=true]:px-4"

const LABEL_CLASS = "hidden group-data-[selected=true]:inline"

/**
 * The kind switch on the left of the toolbar: `All`, one tab per `HISTORY_GENERAL_KINDS`, a divider, then one
 * tab per `HISTORY_ADULT_KINDS`. Exactly one tab is always selected; `All` clears the `kind` param and covers
 * the general kinds only.
 *
 * Tabs are icons only; the selected one also shows its label. Each tab keeps an `aria-label`, since a hidden
 * label doesn't name it.
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
      <ToggleButton className={TAB_CLASS} id={ALL} aria-label='All'>
        <HugeiconsIcon icon={SparklesIcon} size={18} strokeWidth={1.8} />
        <span className={LABEL_CLASS}>All</span>
      </ToggleButton>
      {HISTORY_GENERAL_KINDS.map((kind) => (
        <KindTab key={kind} kind={kind} />
      ))}
      <span aria-hidden className='bg-foreground/15 mx-1 h-5 w-px shrink-0' />
      {HISTORY_ADULT_KINDS.map((kind) => (
        <KindTab key={kind} kind={kind} />
      ))}
    </ToggleButtonGroup>
  )
}

function KindTab({ kind }: Readonly<{ kind: HistoryKind }>) {
  return (
    <ToggleButton className={TAB_CLASS} id={kind} aria-label={HISTORY_KIND_LABELS[kind]}>
      <HugeiconsIcon icon={KIND_ICONS[kind]} size={18} strokeWidth={1.8} />
      <span className={LABEL_CLASS}>{HISTORY_KIND_LABELS[kind]}</span>
    </ToggleButton>
  )
}
