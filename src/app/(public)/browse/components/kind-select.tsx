"use client"

import { useCallback } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { KIND_LABELS } from "@/constants"

import type { BrowseFilters } from "../actions/read-filters"
import { useBrowseQuery } from "../hooks/use-browse-query"

const ALL = "all"

/**
 * Labels for `SelectValue`, which shows the raw value without them.
 */
const KIND_ITEMS = { [ALL]: "All", ...KIND_LABELS }

/**
 * Quick kind switch in the page header. Lists only the kinds that have seasons; the filter drawer edits the
 * same `kind` param.
 */
export function KindSelect({ kinds }: Readonly<{ kinds: BrowseFilters["kinds"] }>) {
  const { query, update } = useBrowseQuery()

  const handleChange = useCallback(
    (value: string | null) => {
      const kind = kinds.find((option) => option.value === value)?.value ?? null
      update({ kind })
    },
    [kinds, update]
  )

  return (
    <Select items={KIND_ITEMS} value={query.kind ?? ALL} onValueChange={handleChange}>
      <SelectTrigger
        aria-label='Kind'
        className='bg-foreground/5 dark:bg-foreground/5 dark:hover:bg-foreground/10 min-w-24 rounded-sm border-0 font-bold text-nowrap data-[size=default]:h-10'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        className='bg-background/80 rounded-sm shadow-lg ring-0 shadow-black/50 backdrop-blur-lg'>
        <SelectItem className='rounded-sm' value={ALL}>
          All
        </SelectItem>
        {kinds
          .filter((option) => option.count > 0)
          .map((option) => (
            <SelectItem className='rounded-sm' key={option.value} value={option.value}>
              {KIND_LABELS[option.value]}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
