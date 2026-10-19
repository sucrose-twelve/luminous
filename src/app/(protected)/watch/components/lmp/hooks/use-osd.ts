import { useCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * How long a message stays (the fade is part of the `osd` animation), and how soon a second seek adds to the
 * first instead of replacing it.
 */
const OSD_DURATION = 800
const SEEK_CHAIN_WINDOW = 1_000

export type OsdMessage = { id: number; text: string }

/**
 * The on-screen message in the middle of the player ("Pause", "Volume 55%", "+30 s").
 *
 * A new message replaces the current one at once. Seeks within a second of each other add up, so three
 * presses of → read "+30 s".
 */
export function useOsd() {
  const [message, setMessage] = useState<OsdMessage | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const seekRef = useRef({ total: 0, at: 0 })

  const flash = useCallback((text: string) => {
    clearTimeout(timerRef.current)
    setMessage((current) => ({ id: (current?.id ?? 0) + 1, text }))
    timerRef.current = setTimeout(() => setMessage(null), OSD_DURATION)
  }, [])

  const flashSeek = useCallback(
    (delta: number) => {
      const now = performance.now()
      const seek = seekRef.current
      const isChained =
        now - seek.at < SEEK_CHAIN_WINDOW && Math.sign(seek.total) === Math.sign(delta)
      seek.total = isChained ? seek.total + delta : delta
      seek.at = now
      flash(`${seek.total > 0 ? "+" : "−"}${Math.abs(seek.total)} s`)
    },
    [flash]
  )

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return useMemo(() => ({ message, flash, flashSeek }), [message, flash, flashSeek])
}
