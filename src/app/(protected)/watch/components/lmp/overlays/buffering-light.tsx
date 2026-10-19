"use client"

import { useEffect, useState } from "react"

import { EdgeLight } from "@/components/edge-light"

import type { LmpStatus } from "../types"

/**
 * A wait shorter than this shows nothing, so quick seeks don't flash the light.
 */
const SHOW_DELAY = 300

export function BufferingLight({ status }: Readonly<{ status: LmpStatus }>) {
  const isWaiting = status === "loading" || status === "buffering"
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isWaiting) return

    const timeout = setTimeout(() => setIsVisible(true), SHOW_DELAY)
    return () => {
      clearTimeout(timeout)
      setIsVisible(false)
    }
  }, [isWaiting])

  if (!isWaiting || !isVisible) return null

  return (
    <div
      role='status'
      aria-label='Loading'
      className='pointer-events-none absolute inset-0'>
      <EdgeLight />
    </div>
  )
}
