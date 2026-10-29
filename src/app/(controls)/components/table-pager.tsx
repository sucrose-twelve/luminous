"use client"

import { useCallback } from "react"

import { Pager } from "@/components/pager"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { CONTROL_PAGE_SIZES } from "@/constants"

import { useControlQuery } from "../hooks/use-control-query"

/**
 * Labels for `SelectValue`, which shows the raw value without them.
 */
const SIZE_ITEMS = CONTROL_PAGE_SIZES.map((size) => ({
  value: String(size),
  label: String(size)
}))

/**
 * The bar under a control panel table: which rows are shown, rows per page, and the shared `Pager` (hidden when
 * there is one page). Reads the page from the server result, which clamps a page past the end.
 */
export function TablePager({
  page
}: Readonly<{
  page: Omit<Pagination, "data">
}>) {
  const { isPending, update } = useControlQuery()
  const first = page.count === 0 ? 0 : (page.currentPage - 1) * page.take + 1
  const last = Math.min(page.currentPage * page.take, page.count)

  const handlePageChange = useCallback(
    (value: number) => update({ page: value }),
    [update]
  )

  const handleSizeChange = useCallback(
    (value: string | null) => {
      const take = CONTROL_PAGE_SIZES.find((size) => String(size) === value)
      if (take) update({ take })
    },
    [update]
  )

  return (
    <div className='flex items-center justify-between gap-6'>
      <div className='text-xs text-nowrap text-zinc-400'>
        {first} ~ {last} of {page.count}
      </div>

      <Pager
        currentPage={page.currentPage}
        lastPage={page.lastPage}
        prevPage={page.prevPage}
        nextPage={page.nextPage}
        isPending={isPending}
        onChange={handlePageChange}
      />

      <div className='flex items-center gap-2'>
        <span className='text-nowrap'>Rows per page</span>
        <Select
          items={SIZE_ITEMS}
          value={String(page.take)}
          onValueChange={handleSizeChange}>
          <SelectTrigger
            aria-label='Rows per page'
            className='bg-foreground/5 dark:bg-foreground/5 dark:hover:bg-foreground/10 min-w-16 rounded-md border-0 text-xs data-[size=default]:h-8'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className='rounded-md'>
            {SIZE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value} className='text-xs'>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
