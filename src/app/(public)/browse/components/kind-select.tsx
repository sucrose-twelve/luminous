"use client"

import { ListBox, Select, type Key } from "@heroui/react"
import { useCallback } from "react"

import type { BrowseFilters } from "../actions/read-filters"
import { useBrowseQuery } from "../hooks/use-browse-query"
import { KIND_LABELS } from "../utils"

const ALL = "all"

/**
 * Quick kind switch in the page header. Lists only the kinds that have seasons; the filter drawer edits the
 * same `kind` param.
 */
export function KindSelect({ kinds }: Readonly<{ kinds: BrowseFilters["kinds"] }>) {
  const { query, update } = useBrowseQuery()

  const handleChange = useCallback(
    (value: Key | Key[] | null) => {
      const kind = kinds.find((option) => option.value === value)?.value ?? null
      update({ kind })
    },
    [kinds, update]
  )

  return (
    <Select
      className='w-full min-w-28'
      aria-label='Kind'
      value={query.kind ?? ALL}
      onChange={handleChange}>
      <Select.Trigger className='bg-foreground/5 text-foreground rounded-sm font-bold'>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className='bg-background/80 rounded-sm border-none shadow-lg shadow-black/50 backdrop-blur-lg'>
        <ListBox>
          <ListBox.Item className='rounded-sm' id={ALL} textValue='All'>
            All
            <ListBox.ItemIndicator />
          </ListBox.Item>
          {kinds
            .filter((option) => option.count > 0)
            .map((option) => (
              <ListBox.Item
                className='rounded-sm'
                key={option.value}
                id={option.value}
                textValue={KIND_LABELS[option.value]}>
                {KIND_LABELS[option.value]}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
