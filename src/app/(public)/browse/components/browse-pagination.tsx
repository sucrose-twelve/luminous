"use client"

import { useCallback } from "react"

import { Pager } from "@/components/pager"

import { useBrowseQuery } from "../hooks/use-browse-query"

/**
 * The shared `Pager` wired to the browse page's URL state.
 */
export function BrowsePagination(
  props: Readonly<{
    currentPage: number
    lastPage: number
    prevPage: number | null
    nextPage: number | null
  }>
) {
  const { isPending, update } = useBrowseQuery()

  const handleChange = useCallback((page: number) => update({ page }), [update])

  return <Pager {...props} isPending={isPending} onChange={handleChange} />
}
