"use client"

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

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
  "group h-9 min-w-9 gap-2 rounded-lg bg-transparent px-0 font-bold text-zinc-400 hover:bg-transparent hover:text-foreground aria-pressed:bg-primary aria-pressed:px-3 aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground sm:aria-pressed:px-4"

const LABEL_CLASS = "hidden group-aria-pressed:inline"

/**
 * The kind switch on the left of the toolbar: `All`, one tab per `HISTORY_GENERAL_KINDS`, a divider, then one
 * tab per `HISTORY_ADULT_KINDS`. Exactly one tab is always selected; `All` clears the `kind` param and covers
 * the general kinds only.
 *
 * Tabs are icons only; the selected one also shows its label. Each tab keeps an `aria-label`, since a hidden
 * label doesn't name it. Pressing the selected tab again changes nothing (Base UI would empty the group).
 */
export function KindTabs() {
  const { query, update } = useHistoryQuery()
  const value = useMemo(() => [query.kind ?? ALL], [query.kind])

  const handleChange = useCallback(
    (values: string[]) => {
      const [key] = values
      if (!key) return
      const kind = HISTORY_KINDS.find((value) => value === key) ?? null
      if (kind !== query.kind) update({ kind })
    },
    [query.kind, update]
  )

  return (
    <ToggleGroup
      aria-label='Kind'
      className='gap-1 overflow-x-auto'
      value={value}
      onValueChange={handleChange}>
      <ToggleGroupItem className={TAB_CLASS} value={ALL} aria-label='All'>
        <HugeiconsIcon className='size-4.5' icon={SparklesIcon} strokeWidth={1.8} />
        <span className={LABEL_CLASS}>All</span>
      </ToggleGroupItem>
      {HISTORY_GENERAL_KINDS.map((kind) => (
        <KindTab key={kind} kind={kind} />
      ))}
      <span aria-hidden className='bg-foreground/15 mx-1 h-5 w-px shrink-0' />
      {HISTORY_ADULT_KINDS.map((kind) => (
        <KindTab key={kind} kind={kind} />
      ))}
    </ToggleGroup>
  )
}

function KindTab({ kind }: Readonly<{ kind: HistoryKind }>) {
  return (
    <ToggleGroupItem
      className={TAB_CLASS}
      value={kind}
      aria-label={HISTORY_KIND_LABELS[kind]}>
      <HugeiconsIcon className='size-4.5' icon={KIND_ICONS[kind]} strokeWidth={1.8} />
      <span className={LABEL_CLASS}>{HISTORY_KIND_LABELS[kind]}</span>
    </ToggleGroupItem>
  )
}
