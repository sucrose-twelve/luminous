"use client"

import { Dropdown, Kbd, Label, Separator, type Selection } from "@heroui/react"
import {
  KeyboardIcon,
  PreferenceHorizontalIcon,
  SlidersHorizontalIcon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useMemo, type RefObject } from "react"

import { cls } from "@/libs/utils"

import type { LmpProps } from "../types"
import { ControlButton } from "./control-button"
import { PLAYER_MENU_ITEM, PlayerMenu } from "./player-menu"

export type PlaybackPreference = LmpProps["preference"]

const TOGGLES: { key: keyof PlaybackPreference; label: string }[] = [
  { key: "autoplayNext", label: "Autoplay Next" },
  { key: "autoSkip", label: "Auto Skip" }
]

/**
 * "Preferences": its button, the Autoplay Next and Auto Skip switches (saved to the account), plus the way
 * into the keyboard shortcut list.
 *
 * The switches are checkbox items of a multiple-selection section, which keeps the menu open while they flip.
 */
export function PreferencesMenu({
  preference,
  anchorRef,
  isOpen,
  onOpenChange,
  onToggle,
  onOpenShortcuts
}: Readonly<{
  preference: PlaybackPreference
  anchorRef: RefObject<HTMLElement | null>
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onToggle: (key: keyof PlaybackPreference) => void
  onOpenShortcuts: () => void
}>) {
  const selectedKeys = useMemo(
    () => TOGGLES.filter(({ key }) => preference[key]).map(({ key }) => key),
    [preference]
  )

  /**
   * One press flips one switch: the changed key is the one whose new state differs from the preference.
   */
  const handleSelectionChange = useCallback(
    (keys: Selection) => {
      if (keys === "all") return
      const toggled = TOGGLES.find(({ key }) => keys.has(key) !== preference[key])
      if (toggled) onToggle(toggled.key)
    },
    [preference, onToggle]
  )

  return (
    <PlayerMenu
      title='Preferences'
      icon={SlidersHorizontalIcon}
      align='end'
      anchorRef={anchorRef}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trigger={<ControlButton label='Preferences' icon={PreferenceHorizontalIcon} />}>
      <Dropdown.Menu aria-label='Preferences' className='gap-0 p-0'>
        <Dropdown.Section
          aria-label='Playback'
          selectionMode='multiple'
          selectedKeys={selectedKeys}
          onSelectionChange={handleSelectionChange}
          className='items-stretch'>
          {TOGGLES.map(({ key, label }) => (
            <Dropdown.Item
              key={key}
              id={key}
              textValue={label}
              className={PLAYER_MENU_ITEM}>
              {({ isSelected }) => (
                <>
                  <Label>{label}</Label>
                  <span
                    aria-hidden
                    className={cls(
                      "relative h-4.5 w-8 shrink-0 rounded-full ring-1 transition-colors",
                      isSelected ? "bg-theme ring-theme" : "bg-transparent ring-white/60"
                    )}>
                    <span
                      className={cls(
                        "absolute top-1/2 left-0.5 size-3.5 -translate-y-1/2 rounded-full transition-transform",
                        isSelected ? "translate-x-3.5 bg-black" : "bg-white/80"
                      )}
                    />
                  </span>
                </>
              )}
            </Dropdown.Item>
          ))}
        </Dropdown.Section>
        <Separator className='my-2 ms-0 w-full bg-white/15' />
        <Dropdown.Item
          id='shortcuts'
          textValue='Keyboard shortcuts'
          onAction={onOpenShortcuts}
          className={cls(PLAYER_MENU_ITEM, "justify-start gap-3")}>
          <HugeiconsIcon icon={KeyboardIcon} size={18} strokeWidth={1.5} />
          <Label className='grow whitespace-nowrap'>Keyboard shortcuts</Label>
          <Kbd
            slot='keyboard'
            className='h-auto rounded-sm bg-white/10 px-1.5 py-0.5 text-xs text-white ring-1 ring-white/15'>
            <Kbd.Content>Shift+/</Kbd.Content>
          </Kbd>
        </Dropdown.Item>
      </Dropdown.Menu>
    </PlayerMenu>
  )
}
