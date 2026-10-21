import { useEffect, useRef } from "react"

import { matchHotkey, type HotkeyAction } from "../hotkeys"

export type HotkeyHandlers = Record<HotkeyAction, () => void>

/**
 * Runs the player's shortcuts (`HOTKEYS`) while the tab is active, wherever focus is on the page.
 *
 * Listens on `window` in the capture phase, so a focused control never sees the key first, and stops the key
 * there. Space is cancelled on keyup too: a focused button clicks on Space's keyup, so Space would otherwise
 * both toggle playback and press it (Firefox needs the keyup half). Buttons are pressed with Enter. The
 * listeners are added once per session; the latest handlers are read through a ref.
 *
 * @param handlers - What each `HotkeyAction` does
 */
export function useLmpHotkeys(handlers: HotkeyHandlers) {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hotkey = matchHotkey(event)
      if (!hotkey) return

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
        !event.metaKey
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
