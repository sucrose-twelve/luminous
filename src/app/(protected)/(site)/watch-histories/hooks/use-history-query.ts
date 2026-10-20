"use client"

import { useQueryStates, type Nullable, type Values } from "nuqs"
import { useCallback, useMemo, useTransition } from "react"

import { useLoader } from "@/hooks"

import { historyParsers } from "../validator.nuqs"

export type HistoryQuery = Values<typeof historyParsers>

export type HistoryPatch = Partial<Nullable<HistoryQuery>>

/**
 * The history page's URL state, shared by every control (kind, status, sort, view, pager).
 *
 * `update` re-renders the page on the server (`shallow: false`) inside a transition and shows the top loader
 * bar; the view is rendered on the server too. A filter or sort change goes back to page 1, so a narrower
 * filter never lands past the last page; switching the view keeps the page, and a page change scrolls to the
 * top.
 */
export function useHistoryQuery() {
  const loader = useLoader()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useQueryStates(historyParsers, {
    shallow: false,
    startTransition
  })

  const update = useCallback(
    (patch: HistoryPatch) => {
      loader.on()
      const keepsPage = "page" in patch || "view" in patch
      return setQuery(keepsPage ? patch : { page: null, ...patch }, {
        scroll: "page" in patch
      })
    },
    [loader, setQuery]
  )

  return useMemo(() => ({ query, isPending, update }), [query, isPending, update])
}
