"use client"

import { FilterHorizontalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { HISTORY_SORT_LABELS, HISTORY_SORTS } from "@/constants"

import { useHistoryQuery } from "../hooks/use-history-query"

export function SortSelect() {
  const { query, update } = useHistoryQuery()

  const handleChange = useCallback(
    (value: string | null) => {
      const sort = HISTORY_SORTS.find((option) => option === value)
      if (sort && sort !== query.sort) update({ sort })
    },
    [query.sort, update]
  )

  return (
    <Select items={HISTORY_SORT_LABELS} value={query.sort} onValueChange={handleChange}>
      <SelectTrigger
        aria-label='Sort by'
        className='bg-foreground/5 dark:bg-foreground/5 dark:hover:bg-foreground/10 w-full min-w-52 gap-2 rounded-lg border-0 text-xs font-bold data-[size=default]:h-9 sm:w-auto'>
        <HugeiconsIcon
          className='text-zinc-400'
          icon={FilterHorizontalIcon}
          strokeWidth={1.8}
        />
        <span className='font-normal text-zinc-400'>Sort:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        className='bg-background/80 rounded-sm shadow-lg ring-0 shadow-black/50 backdrop-blur-lg'>
        {HISTORY_SORTS.map((sort) => (
          <SelectItem className='rounded-sm' key={sort} value={sort}>
            {HISTORY_SORT_LABELS[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
