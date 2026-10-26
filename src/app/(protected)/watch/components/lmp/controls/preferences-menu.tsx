"use client"

import { AnimatePresence, m, type Transition } from "framer-motion"
import { useCallback, useEffect, useId, useRef } from "react"

import {
  AudioLinesIcon,
  CheckIcon,
  CircleProgressPlayIcon,
  FastForwardIcon,
  MoreVerticalIcon
} from "@/app/(protected)/watch/components/lmp/icons"
import { languageName } from "@/libs/language"
import { usePlayerStore } from "@/stores/player"

import type { LmpAudioTrack, LmpProps } from "../types"
import { endonym } from "../utils"
import { ControlButton } from "./control-button"
import { Switch } from "./switch"

export type PlaybackPreference = LmpProps["preference"]

const TOGGLES: { key: keyof PlaybackPreference; label: string; icon: React.ReactNode }[] =
  [
    { key: "autoplayNext", label: "Autoplay Next", icon: <CircleProgressPlayIcon /> },
    { key: "autoSkip", label: "Auto Skip", icon: <FastForwardIcon /> }
  ]

/**
 * A row of the popover: a full-width button, lighter on hover and keyboard focus.
 */
const MENU_ROW =
  "flex w-full cursor-pointer items-center justify-between gap-3 rounded px-2.5 py-2 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10"

const POP: Transition = { duration: 0.2, ease: "easeOut" }

/**
 * "Preferences" (`docs/design/LMP.png`): the button at the right end of the top bar, and the popover it opens
 * below it.
 *
 * - Switches: Autoplay Next and Auto Skip, saved to the account (`onTogglePreference`), and Stable Volume,
 *   kept per device in the player store. Stable Volume changes no sound yet
 *   (`notes/lmp-stable-volume-plan.md`).
 * - "Audio Language": every track of this episode, in English and in its own language, the playing one
 *   checked. Only when there is a choice.
 * - Keyboard shortcuts, which opens the shortcut list (`Shift+/`).
 *
 * A disclosure: focus stays on the button, and Tab goes on into the popover. Escape closes it (focus returns
 * to the button); a click outside closes it through the session's dismiss layer, which the popover sits above.
 */
export function PreferencesMenu({
  isOpen,
  onOpenChange,
  preference,
  onTogglePreference,
  audio,
  onOpenShortcuts
}: Readonly<{
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  preference: PlaybackPreference
  onTogglePreference: (key: keyof PlaybackPreference) => void
  audio: {
    tracks: LmpAudioTrack[]
    currentId: string
    onSelect: (track: LmpAudioTrack) => void
  }
  onOpenShortcuts: () => void
}>) {
  const panelId = useId()
  const audioId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const stableVolume = usePlayerStore((state) => state.stableVolume)
  const setStableVolume = usePlayerStore((state) => state.setStableVolume)

  const toggle = useCallback(() => onOpenChange(!isOpen), [isOpen, onOpenChange])

  const toggleStableVolume = useCallback(
    () => setStableVolume(!stableVolume),
    [stableVolume, setStableVolume]
  )

  /**
   * The shortcut list gives focus back to whatever had it when it closes: make that the button, not this row,
   * which unmounts with the popover.
   */
  const openShortcuts = useCallback(() => {
    buttonRef.current?.focus({ preventScroll: true })
    onOpenShortcuts()
  }, [onOpenShortcuts])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (panelRef.current?.contains(document.activeElement))
        buttonRef.current?.focus({ preventScroll: true })
      onOpenChange(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onOpenChange])

  return (
    <>
      <ControlButton
        ref={buttonRef}
        label='Preferences'
        panel={{ id: panelId, isOpen }}
        onPress={toggle}>
        <MoreVerticalIcon />
      </ControlButton>
      <AnimatePresence>
        {isOpen && (
          <m.div
            ref={panelRef}
            id={panelId}
            role='group'
            aria-label='Preferences'
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={POP}
            className='border-gradient bg-background/40 absolute top-full right-0 z-20 mt-3 max-h-[calc(100dvh-5rem)] w-60 overflow-y-auto overscroll-contain rounded-lg p-2 text-[13px] text-white backdrop-blur-2xl sm:mt-5'>
            {TOGGLES.map(({ key, label, icon }) => (
              <Switch
                key={key}
                label={label}
                icon={icon}
                isOn={preference[key]}
                onToggle={() => onTogglePreference(key)}
                className={MENU_ROW}
              />
            ))}
            <Switch
              label='Stable Volume'
              icon={<AudioLinesIcon />}
              isOn={stableVolume}
              onToggle={toggleStableVolume}
              className={MENU_ROW}
            />
            {audio.tracks.length > 1 && (
              <div role='group' aria-labelledby={audioId}>
                <p
                  id={audioId}
                  className='my-1.5 rounded-md bg-white/15 py-1 text-center text-xs text-white/85'>
                  Audio Language
                </p>
                {audio.tracks.map((track) => {
                  const isCurrent = track.id === audio.currentId
                  return (
                    <button
                      key={track.id}
                      type='button'
                      aria-current={isCurrent || undefined}
                      onClick={() => audio.onSelect(track)}
                      className={MENU_ROW}>
                      <span>
                        {languageName(track.language)} (
                        <span lang={track.language}>{endonym(track.language)}</span>)
                      </span>
                      {isCurrent && <CheckIcon aria-hidden className='size-4 shrink-0' />}
                    </button>
                  )
                })}
              </div>
            )}
            <div aria-hidden className='mx-2.5 my-1.5 h-px bg-white/10' />
            <button type='button' onClick={openShortcuts} className={MENU_ROW}>
              Keyboard shortcuts
              <kbd className='rounded-sm bg-white/10 px-1.5 py-0.5 font-sans text-[11px] text-white/85'>
                Shift+/
              </kbd>
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
