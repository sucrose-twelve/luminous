"use client"

import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback } from "react"

import { useControlQuery } from "@/app/(controls)/hooks/use-control-query"
import { Button } from "@/components/ui/button"

/**
 * Leaves the search results, keeping the filters.
 */
export function ClearSearchButton() {
  const { isPending, update } = useControlQuery()

  const handleClick = useCallback(() => update({ search: null }), [update])

  return (
    <Button variant='outline' disabled={isPending} onClick={handleClick}>
      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} data-icon='inline-start' />
      Clear search
    </Button>
  )
}
