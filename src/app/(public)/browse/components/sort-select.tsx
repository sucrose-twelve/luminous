"use client"

import { useCallback } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { SORT_OPTIONS } from "@/constants"

import { useBrowseQuery } from "../hooks/use-browse-query"
import { sortOptionOf } from "../utils"

/**
 * Labels for `SelectValue`, which shows the raw value without them.
 */
const SORT_ITEMS = SORT_OPTIONS.map((option) => ({
  value: option.id,
  label: option.label
}))

export function SortSelect() {
  const { query, update } = useBrowseQuery()
  const current = sortOptionOf(query)

  const handleChange = useCallback(
    (value: string | null) => {
      const option = SORT_OPTIONS.find((item) => item.id === value)
      if (option) update({ sort: option.sort, order: option.order })
    },
    [update]
  )

  return (
    <Select items={SORT_ITEMS} value={current?.id ?? null} onValueChange={handleChange}>
      <SelectTrigger
        aria-label='Sort by'
        className='bg-foreground/5 dark:bg-foreground/5 dark:hover:bg-foreground/10 min-w-24 rounded-sm border-0 font-bold data-[size=default]:h-10'>
        <SelectValue placeholder='Sort by' />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        className='bg-background/80 rounded-sm shadow-lg ring-0 shadow-black/50 backdrop-blur-lg'>
        {SORT_OPTIONS.map((option) => (
          <SelectItem className='rounded-sm' key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
