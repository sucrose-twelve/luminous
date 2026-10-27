"use client"

import { useCallback } from "react"

import { Progress } from "@/components/ui/progress"

import type { HistoryItem } from "../utils"

/**
 * How far into the shown episode the account is, in the primary color. Screen readers hear the time
 * (`5 minutes of 24 minutes`) rather than a bare percentage. That text comes from a function
 * (`getAriaValueText`), which is why this is a Client Component.
 */
export function HistoryProgress({
  item,
  className
}: Readonly<{ item: HistoryItem; className?: string }>) {
  const getAriaValueText = useCallback(() => item.spokenTime, [item.spokenTime])

  return (
    <Progress
      className={className}
      aria-label='Watch progress'
      value={item.percent}
      getAriaValueText={getAriaValueText}
    />
  )
}
