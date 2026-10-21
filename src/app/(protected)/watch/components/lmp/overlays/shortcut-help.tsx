"use client"

import { Fragment } from "react"

import { cls } from "@/libs/utils"

import { HOTKEYS, type HotkeyAction } from "../hotkeys"
import { Drawer } from "./drawer"

/**
 * The list of keyboard shortcuts, rendered from `HOTKEYS`, so it always matches what the keys do.
 *
 * It opens in the player's `Drawer`, like the Playlist. It doesn't pause the video, and the other shortcuts
 * keep working while it's open: they're read on `window` before the drawer sees them.
 *
 * @param unsupported - Actions this browser can't do (PiP on Firefox); their rows are dimmed
 */
export function ShortcutHelp({
  isOpen,
  onClose,
  unsupported
}: Readonly<{
  isOpen: boolean
  onClose: () => void
  unsupported: ReadonlySet<HotkeyAction>
}>) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title='Keyboard shortcuts'>
      <dl className='grid min-h-0 [scrollbar-width:thin] grid-cols-[1fr_auto] content-start gap-x-6 gap-y-3 overflow-y-auto overscroll-contain px-5 py-4 text-sm'>
        {HOTKEYS.map((hotkey) => {
          const isUnsupported = unsupported.has(hotkey.action)
          return (
            <Fragment key={hotkey.action}>
              <dt className={isUnsupported ? "text-white/35" : "text-white/85"}>
                {hotkey.label}
                {isUnsupported && (
                  <span className='block text-xs'>Not supported in this browser</span>
                )}
              </dt>
              <dd
                className={cls(
                  "flex items-center justify-end gap-1",
                  isUnsupported && "opacity-35"
                )}>
                {hotkey.keys.map((key, index) => (
                  <Fragment key={key}>
                    {index > 0 && <span className='text-white/50'>+</span>}
                    <kbd className='border-gradient min-w-7 rounded-md bg-white/10 px-1.5 py-0.5 text-center font-sans text-xs text-white'>
                      {key}
                    </kbd>
                  </Fragment>
                ))}
              </dd>
            </Fragment>
          )
        })}
      </dl>
    </Drawer>
  )
}
