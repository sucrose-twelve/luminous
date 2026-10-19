"use client"

import { useQueryStates, type Nullable, type Values } from "nuqs"
import { useCallback, useMemo, useTransition } from "react"

import { useLoader } from "@/hooks"

import { browseParsers } from "../validator.nuqs"

export type BrowseQuery = Values<typeof browseParsers>

export type BrowsePatch = Partial<Nullable<BrowseQuery>>

/**
 * The browse page's URL state, shared by every control (kind, sort, filters, pager).
 *
 * `update` re-renders the page on the server (`shallow: false`) inside a transition and shows the top loader
 * bar. Any change other than the page itself goes back to page 1, so a narrower filter never lands past the
 * last page; a page change also scrolls to the top.
 */
export function useBrowseQuery() {
  const loader = useLoader()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useQueryStates(browseParsers, {
    shallow: false,
    startTransition
  })

  const update = useCallback(
    (patch: BrowsePatch) => {
      loader.on()
      return setQuery({ page: null, ...patch }, { scroll: "page" in patch })
    },
    [loader, setQuery]
  )

  return useMemo(() => ({ query, isPending, update }), [query, isPending, update])
}
