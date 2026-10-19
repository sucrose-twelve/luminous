import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react"

/**
 * Idle time before the controls hide while playing.
 */
const HIDE_DELAY = 3_000

/**
 * Shows the top bar and control bar on activity and hides them after `HIDE_DELAY` of none.
 *
 * Mouse movement over the player reveals them, leaving the player hides them, and a touch tap on the video
 * toggles them. While `isPinned` (paused, a panel open, the pointer resting on a bar) they stay up. Also marks
 * the container `data-idle` while hidden, so the cursor can hide with them.
 *
 * @param containerRef - The player container, owned by `<Lmp>`
 * @param isPinned - Keep the controls visible regardless of activity
 */
export function useControlsVisibility(
  containerRef: RefObject<HTMLElement | null>,
  isPinned: boolean
) {
  const [isActive, setIsActive] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const isVisible = isPinned || isActive

  /**
   * Shows the controls for `duration`, then lets them hide (unless pinned).
   */
  const reveal = useCallback((duration = HIDE_DELAY) => {
    clearTimeout(timerRef.current)
    setIsActive(true)
    timerRef.current = setTimeout(() => setIsActive(false), duration)
  }, [])

  const hide = useCallback(() => {
    clearTimeout(timerRef.current)
    setIsActive(false)
  }, [])

  const toggle = useCallback(() => {
    if (isVisible) hide()
    else reveal()
  }, [isVisible, hide, reveal])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse") reveal()
    }
    const handlePointerLeave = (event: PointerEvent) => {
      if (event.pointerType === "mouse") hide()
    }

    reveal()
    container.addEventListener("pointermove", handlePointerMove)
    container.addEventListener("pointerleave", handlePointerLeave)
    return () => {
      clearTimeout(timerRef.current)
      container.removeEventListener("pointermove", handlePointerMove)
      container.removeEventListener("pointerleave", handlePointerLeave)
    }
  }, [containerRef, reveal, hide])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.toggleAttribute("data-idle", !isVisible)
    return () => container.removeAttribute("data-idle")
  }, [containerRef, isVisible])

  return useMemo(
    () => ({ isVisible, reveal, hide, toggle }),
    [isVisible, reveal, hide, toggle]
  )
}
