import { useEffect, useRef } from "react"

import { matchHotkey, type HotkeyAction } from "../hotkeys"

export type HotkeyHandlers = Record<HotkeyAction, () => void>

/**
 * Keys an open menu or list box (a HeroUI `Dropdown` or `Select`) needs to move between and pick its items.
 */
const NAVIGATION_CODES = new Set([
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight"
])

/**
 * Runs the player's shortcuts (`HOTKEYS`) while the tab is active, wherever focus is on the page.
 *
 * Listens on `window` in the capture phase, so a focused control never sees the key first, and stops the key
 * there: React Aria controls (HeroUI) press on Space whether or not it was `defaultPrevented`, so Space would
 * otherwise both toggle playback and press the focused button. Space is cancelled on keyup too, for native
 * buttons (Firefox needs the keyup half). The one exception is focus inside an open menu or list box, which
 * keeps Space and the arrows to pick its items. The listeners are added once per session; the latest handlers
 * are read through a ref.
 *
 * @param handlers - What each `HotkeyAction` does
 */
export function useLmpHotkeys(handlers: HotkeyHandlers) {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    const isInCollection = (event: KeyboardEvent) =>
      event.target instanceof Element &&
      event.target.closest("[role=menu], [role=listbox]") !== null

    const handleKeyDown = (event: KeyboardEvent) => {
      const hotkey = matchHotkey(event)
      if (!hotkey) return
      if (NAVIGATION_CODES.has(hotkey.code) && isInCollection(event)) return

      event.preventDefault()
      event.stopPropagation()
      handlersRef.current[hotkey.action]()
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (
        event.code === "Space" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !isInCollection(event)
      ) {
        event.preventDefault()
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    window.addEventListener("keyup", handleKeyUp, { capture: true })
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
      window.removeEventListener("keyup", handleKeyUp, { capture: true })
    }
  }, [])
}
