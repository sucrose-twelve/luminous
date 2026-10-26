export type HotkeyAction =
  | "togglePlay"
  | "stop"
  | "toggleMute"
  | "volumeUp"
  | "volumeDown"
  | "seekBackward"
  | "seekForward"
  | "seekBackwardLong"
  | "seekForwardLong"
  | "prev"
  | "next"
  | "toggleFullscreen"
  | "togglePip"
  | "toggleShortcutHelp"

/**
 * One keyboard shortcut.
 *
 * @property code - `KeyboardEvent.code`: the physical key, so the Thai layout and Caps Lock don't change it
 * @property shift - Whether Shift must be held; matched exactly
 * @property repeat - Whether a held key keeps firing
 * @property keys - How the shortcut list spells the keys
 */
export type Hotkey = {
  code: string
  shift: boolean
  repeat: boolean
  action: HotkeyAction
  keys: readonly string[]
  label: string
}

/**
 * Every player shortcut. The single source for both the key handler (`use-lmp-hotkeys`) and the shortcut list
 * (`shortcut-help.tsx`): add or change a key here only.
 */
export const HOTKEYS: readonly Hotkey[] = [
  {
    code: "Space",
    shift: false,
    repeat: false,
    action: "togglePlay",
    keys: ["Space"],
    label: "Play / Pause"
  },
  {
    code: "KeyS",
    shift: true,
    repeat: false,
    action: "stop",
    keys: ["Shift", "S"],
    label: "Stop"
  },
  {
    code: "KeyM",
    shift: true,
    repeat: false,
    action: "toggleMute",
    keys: ["Shift", "M"],
    label: "Mute / Unmute"
  },
  {
    code: "ArrowUp",
    shift: false,
    repeat: true,
    action: "volumeUp",
    keys: ["↑"],
    label: "Volume up 5%"
  },
  {
    code: "ArrowDown",
    shift: false,
    repeat: true,
    action: "volumeDown",
    keys: ["↓"],
    label: "Volume down 5%"
  },
  {
    code: "ArrowLeft",
    shift: false,
    repeat: true,
    action: "seekBackward",
    keys: ["←"],
    label: "Back 10 seconds"
  },
  {
    code: "ArrowRight",
    shift: false,
    repeat: true,
    action: "seekForward",
    keys: ["→"],
    label: "Forward 10 seconds"
  },
  {
    code: "ArrowLeft",
    shift: true,
    repeat: true,
    action: "seekBackwardLong",
    keys: ["Shift", "←"],
    label: "Back 30 seconds"
  },
  {
    code: "ArrowRight",
    shift: true,
    repeat: true,
    action: "seekForwardLong",
    keys: ["Shift", "→"],
    label: "Forward 30 seconds"
  },
  {
    code: "KeyP",
    shift: true,
    repeat: false,
    action: "prev",
    keys: ["Shift", "P"],
    label: "Previous episode"
  },
  {
    code: "KeyN",
    shift: true,
    repeat: false,
    action: "next",
    keys: ["Shift", "N"],
    label: "Next episode"
  },
  {
    code: "KeyF",
    shift: true,
    repeat: false,
    action: "toggleFullscreen",
    keys: ["Shift", "F"],
    label: "Fullscreen"
  },
  {
    code: "KeyI",
    shift: true,
    repeat: false,
    action: "togglePip",
    keys: ["Shift", "I"],
    label: "Picture-in-picture"
  },
  {
    code: "Slash",
    shift: true,
    repeat: false,
    action: "toggleShortcutHelp",
    keys: ["Shift", "/"],
    label: "Keyboard shortcuts"
  }
]

/**
 * Finds the shortcut a key event means, or `undefined` when the player should leave it alone.
 *
 * Skips anything with Ctrl / Alt / Meta (browser shortcuts such as Ctrl+Shift+I, Alt+←, and AltGr), IME
 * composition, events already handled, and held keys of shortcuts that don't repeat.
 */
export function matchHotkey(event: KeyboardEvent) {
  if (event.ctrlKey || event.altKey || event.metaKey) return undefined
  if (event.isComposing || event.keyCode === 229 || event.defaultPrevented)
    return undefined

  const hotkey = HOTKEYS.find(
    (item) => item.code === event.code && item.shift === event.shiftKey
  )
  if (!hotkey || (event.repeat && !hotkey.repeat)) return undefined
  return hotkey
}
