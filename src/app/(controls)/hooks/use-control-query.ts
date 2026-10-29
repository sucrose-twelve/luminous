"use client"

import { useQueryStates, type Nullable, type Values } from "nuqs"
import { useCallback, useMemo, useTransition } from "react"

import { useLoader } from "@/hooks"

import { filterParsers, tableParsers } from "../validator.nuqs"

const controlParsers = { ...tableParsers, ...filterParsers }

export type ControlPatch = Partial<Nullable<Values<typeof controlParsers>>>

/**
 * Writes a control panel page's URL state (sort, order, page, page size, filters) for the shared controls.
 *
 * `update` re-renders the page on the server (`shallow: false`) inside a transition and shows the top loader
 * bar. Any change but the page itself goes back to page 1, and a page change scrolls to the top.
 */
export function useControlQuery() {
  const loader = useLoader()
  const [isPending, startTransition] = useTransition()
  const [, setQuery] = useQueryStates(controlParsers, { shallow: false, startTransition })

  const update = useCallback(
    (patch: ControlPatch) => {
      loader.on()
      const isPageChange = "page" in patch
      return setQuery(isPageChange ? patch : { page: null, ...patch }, {
        scroll: isPageChange
      })
    },
    [loader, setQuery]
  )

  return useMemo(() => ({ isPending, update }), [isPending, update])
}
