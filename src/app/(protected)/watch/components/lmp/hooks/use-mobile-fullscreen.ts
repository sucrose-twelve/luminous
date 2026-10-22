import { useEffect, type RefObject } from "react"

import { requestContainerFullscreen } from "./use-fullscreen"

/**
 * A device whose main pointer is a finger: a phone or a tablet.
 */
const TOUCH_QUERY = "(hover: none) and (pointer: coarse)"

/**
 * Opens the player in fullscreen on a touch device (`notes/new-lmp-spec.md`), once per visit to `/watch`.
 *
 * The browser only allows it within a user gesture. Arriving from a link usually still counts (the tap
 * happened a moment ago in the same document), so the first try is on mount; when that is refused (a reload,
 * a slow load), the first tap on the player enters instead. Leaving fullscreen afterwards is the viewer's
 * choice and sticks. A phone without element fullscreen (iPhone) is left alone: its only fullscreen is the
 * native player, which would hide these controls.
 *
 * @param containerRef - The player container, owned by `<Lmp>`
 */
export function useMobileFullscreen(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current
    if (
      !container ||
      typeof container.requestFullscreen !== "function" ||
      !window.matchMedia(TOUCH_QUERY).matches
    )
      return

    let isCancelled = false

    /**
     * A touch `pointerup` is a user gesture, and this runs in the capture phase, before the tap does its own
     * thing (show the controls, press a button).
     */
    const enterOnTap = () => {
      if (!document.fullscreenElement)
        requestContainerFullscreen(container).catch(() => {})
    }

    requestContainerFullscreen(container).catch(() => {
      if (!isCancelled)
        container.addEventListener("pointerup", enterOnTap, { capture: true, once: true })
    })

    return () => {
      isCancelled = true
      container.removeEventListener("pointerup", enterOnTap, { capture: true })
    }
  }, [containerRef])
}
