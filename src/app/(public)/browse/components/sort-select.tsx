"use client"

import { ListBox, Select, type Key } from "@heroui/react"
import { useCallback } from "react"

import { SORT_OPTIONS } from "@/constants"

import { useBrowseQuery } from "../hooks/use-browse-query"
import { sortOptionOf } from "../utils"

export function SortSelect() {
  const { query, update } = useBrowseQuery()
  const current = sortOptionOf(query)

  const handleChange = useCallback(
    (value: Key | Key[] | null) => {
      const option = SORT_OPTIONS.find((item) => item.id === value)
      if (option) update({ sort: option.sort, order: option.order })
    },
    [update]
  )

  return (
    <Select
      className='min-w-24'
      aria-label='Sort by'
      placeholder='Sort by'
      value={current?.id ?? null}
      onChange={handleChange}>
      <Select.Trigger className='bg-foreground/5 text-foreground rounded-sm font-bold'>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className='bg-background/80 rounded-sm border-none shadow-lg shadow-black/50 backdrop-blur-lg'>
        <ListBox>
          {SORT_OPTIONS.map((option) => (
            <ListBox.Item
              className='rounded-sm'
              key={option.id}
              id={option.id}
              textValue={option.label}>
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
