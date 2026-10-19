import { useCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * A second tap within `DOUBLE_TAP_WINDOW` on the same side seeks; after that, each tap within `CHAIN_WINDOW`
 * of the previous one adds another step ("+20 s", "+30 s").
 */
const DOUBLE_TAP_WINDOW = 300
const CHAIN_WINDOW = 600
const SEEK_STEP = 10
const RIPPLE_DURATION = 800

/**
 * The outer 35 % of the video on each side seek; the middle 30 % has no double-tap action.
 */
const SIDE_ZONE = 0.35

export type TapSide = -1 | 1
export type TapRipple = { id: number; side: TapSide; total: number }

/**
 * Touch gestures on the video: a tap shows or hides the controls at once (no waiting to rule out a double tap),
 * and a double tap on the left / right side seeks −10 / +10 s, undoing the first tap's toggle.
 *
 * @param onTap - A single tap (toggle the controls)
 * @param onSeek - A double or chained tap, with the step to seek by
 * @returns `handleTap` for the video surface's `pointerup`, and the `ripple` to draw on the tapped side
 */
export function useDoubleTap(onTap: () => void, onSeek: (delta: number) => void) {
  const [ripple, setRipple] = useState<TapRipple | null>(null)
  const lastRef = useRef<{
    side: TapSide | 0
    at: number
    total: number
    isChained: boolean
  } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleTap = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const ratio = rect.width ? (event.clientX - rect.left) / rect.width : 0.5
      const side: TapSide | 0 = ratio < SIDE_ZONE ? -1 : ratio > 1 - SIDE_ZONE ? 1 : 0
      const now = performance.now()
      const last = lastRef.current
      const limit = last?.isChained ? CHAIN_WINDOW : DOUBLE_TAP_WINDOW

      if (side !== 0 && last && last.side === side && now - last.at < limit) {
        if (!last.isChained) onTap()
        const total = last.total + side * SEEK_STEP
        lastRef.current = { side, at: now, total, isChained: true }
        onSeek(side * SEEK_STEP)

        clearTimeout(timerRef.current)
        setRipple((current) => ({ id: (current?.id ?? 0) + 1, side, total }))
        timerRef.current = setTimeout(() => setRipple(null), RIPPLE_DURATION)
        return
      }

      lastRef.current = { side, at: now, total: 0, isChained: false }
      onTap()
    },
    [onTap, onSeek]
  )

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return useMemo(() => ({ ripple, handleTap }), [ripple, handleTap])
}
