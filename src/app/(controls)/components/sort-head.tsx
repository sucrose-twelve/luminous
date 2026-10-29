"use client"

import { ArrowDownUp, ArrowDownUp2, ArrowDownUp3 } from "@keyline-icons/react/two-tone"
import { useCallback } from "react"

import { TableHead } from "@/components/ui/table"
import type { Order } from "@/constants"
import { cls } from "@/libs/utils"

import { useControlQuery } from "../hooks/use-control-query"

/**
 * A sortable column head (`docs/design/controls/table-head.png`). Clicking another column sorts by it in its
 * `firstOrder` (text A→Z, dates and counts newest/largest first); clicking the sorted column flips the order.
 *
 * @param current - The sort the page is rendered with, defaults included, so the default column shows as
 * sorted before anything is in the URL
 */
export function SortHead({
  column,
  label,
  current,
  firstOrder = "asc",
  className
}: Readonly<{
  column: string
  label: string
  current: { sort: string; order: Order }
  firstOrder?: Order
  className?: string
}>) {
  const { isPending, update } = useControlQuery()
  const isSorted = current.sort === column
  const Icon = !isSorted
    ? ArrowDownUp
    : current.order === "asc"
      ? ArrowDownUp2
      : ArrowDownUp3

  const handleClick = useCallback(() => {
    const order = isSorted ? (current.order === "asc" ? "desc" : "asc") : firstOrder
    update({ sort: column, order })
  }, [column, current.order, firstOrder, isSorted, update])

  return (
    <TableHead
      aria-sort={
        isSorted ? (current.order === "asc" ? "ascending" : "descending") : undefined
      }
      className={className}>
      <button
        type='button'
        disabled={isPending}
        onClick={handleClick}
        className={cls(
          "inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium tracking-wide uppercase transition-colors",
          isSorted ? "text-foreground" : "text-zinc-500 hover:text-zinc-300"
        )}>
        {label}
        <Icon size={14} strokeWidth={1.5} aria-hidden />
      </button>
    </TableHead>
  )
}

/**
 * A column head that doesn't sort, styled like `SortHead`.
 */
export function PlainHead({
  label,
  className
}: Readonly<{ label?: string; className?: string }>) {
  return (
    <TableHead
      className={cls(
        "text-xs font-medium tracking-wide text-zinc-500 uppercase",
        className
      )}>
      {label}
    </TableHead>
  )
}
