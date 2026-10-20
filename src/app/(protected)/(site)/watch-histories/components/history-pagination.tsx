"use client"

import { useCallback } from "react"

import { Pager } from "@/components/pager"

import { useHistoryQuery } from "../hooks/use-history-query"

/**
 * The shared `Pager` wired to the history page's URL state.
 */
export function HistoryPagination(
  props: Readonly<{
    currentPage: number
    lastPage: number
    prevPage: number | null
    nextPage: number | null
  }>
) {
  const { isPending, update } = useHistoryQuery()

  const handleChange = useCallback((page: number) => update({ page }), [update])

  return <Pager {...props} isPending={isPending} onChange={handleChange} />
}
