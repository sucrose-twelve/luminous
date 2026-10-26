"use client"

import { ListBox, Select, type Key } from "@heroui/react"
import { FilterHorizontalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback } from "react"

import { HISTORY_SORT_LABELS, HISTORY_SORTS } from "@/constants"

import { useHistoryQuery } from "../hooks/use-history-query"

export function SortSelect() {
  const { query, update } = useHistoryQuery()

  const handleChange = useCallback(
    (value: Key | Key[] | null) => {
      const sort = HISTORY_SORTS.find((option) => option === value)
      if (sort && sort !== query.sort) update({ sort })
    },
    [query.sort, update]
  )

  return (
    <Select
      className='w-full min-w-52 sm:w-auto'
      aria-label='Sort by'
      value={query.sort}
      onChange={handleChange}>
      <Select.Trigger className='bg-foreground/5 text-foreground flex h-9 items-center gap-2 rounded-lg text-xs font-bold'>
        <HugeiconsIcon
          className='text-zinc-400'
          icon={FilterHorizontalIcon}
          size={16}
          strokeWidth={1.8}
        />
        <span className='text-xs font-normal text-zinc-400'>Sort:</span>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className='bg-background/80 rounded-sm border-none shadow-lg shadow-black/50 backdrop-blur-lg'>
        <ListBox>
          {HISTORY_SORTS.map((sort) => (
            <ListBox.Item
              className='rounded-sm'
              key={sort}
              id={sort}
              textValue={HISTORY_SORT_LABELS[sort]}>
              {HISTORY_SORT_LABELS[sort]}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
