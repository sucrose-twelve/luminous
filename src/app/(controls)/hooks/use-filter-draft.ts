"use client"

import { isEqual, mapValues } from "es-toolkit"
import { useQueryStates, type UseQueryStatesKeysMap, type Values } from "nuqs"
import { useCallback, useMemo, useState } from "react"

import { useControlQuery, type ControlPatch } from "./use-control-query"

/**
 * The draft behind a filters panel: choices stay local until `apply` writes them to the URL, and `reset` returns
 * both to the defaults. The draft restarts from the URL whenever the URL's filters change (Back, a cleared
 * filter).
 *
 * A filter may default to something (`kind: ["anime_series"]`), so a filter at its default leaves the URL, and
 * an emptied one is written as an empty param (`?kind=`), which reads back as "no filter" rather than the
 * default.
 *
 * @param parsers - The page's list filters (`parseAsArrayOf(…).withDefault(…)`), which the panel reads back
 */
export function useFilterDraft<P extends UseQueryStatesKeysMap>(parsers: P) {
  const [applied] = useQueryStates(parsers)
  const { isPending, update } = useControlQuery()
  const [draft, setDraft] = useState(applied)
  const [previous, setPrevious] = useState(applied)

  if (!isEqual(previous, applied)) {
    setPrevious(applied)
    setDraft(applied)
  }

  const defaults = useMemo(
    () =>
      mapValues(parsers, (parser) =>
        "defaultValue" in parser ? parser.defaultValue : []
      ) as Values<P>,
    [parsers]
  )

  const set = useCallback(
    <K extends keyof Values<P>>(key: K, value: Values<P>[K]) =>
      setDraft((current) => ({ ...current, [key]: value })),
    []
  )

  const apply = useCallback(
    () =>
      update(
        mapValues(draft, (value, key) =>
          isEqual(value, defaults[key]) ? null : value
        ) as ControlPatch
      ),
    [defaults, draft, update]
  )

  const reset = useCallback(() => {
    setDraft(defaults)
    update(mapValues(defaults, () => null) as ControlPatch)
  }, [defaults, update])

  return useMemo(
    () => ({
      draft,
      set,
      apply,
      reset,
      isPending,
      isDirty: !isEqual(draft, applied),
      hasFilters: !isEqual(draft, defaults) || !isEqual(applied, defaults)
    }),
    [applied, apply, defaults, draft, isPending, reset, set]
  )
}
