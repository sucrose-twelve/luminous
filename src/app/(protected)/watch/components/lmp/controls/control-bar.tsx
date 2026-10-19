"use client"

import { useRef, useState, type RefObject } from "react"

import { cls } from "@/libs/utils"

import type { LmpActions, LmpAudioTrack, LmpProps, LmpStatus } from "../types"
import { AudioMenu } from "./audio-menu"
import { FullscreenButton } from "./fullscreen-button"
import { PipButton } from "./pip-button"
import { PlayButton } from "./play-button"
import { PreferencesMenu, type PlaybackPreference } from "./preferences-menu"
import { ProgressBar } from "./progress-bar"
import { SeekButton } from "./seek-button"
import { TimeDisplay } from "./time-display"
import { TrackButton } from "./track-button"
import { VolumeControl } from "./volume-control"

type Toggle = { isSupported: boolean; isActive: boolean; onToggle: () => void }

export type LmpMenu = "audio" | "preferences"

/**
 * The bottom of the player, as in `docs/design/00-Overview.png`: elapsed / duration, the progress bar, then
 * three groups. Left: audio tracks and volume. Center (always centered): previous, −10, play, +10, next.
 * Right: picture-in-picture, fullscreen, preferences. The two menus open above the progress bar, on the side
 * of their button (`01-Actions.png`): the progress bar is their anchor.
 *
 * @param isVisible - `false` fades it out (auto-hide) and makes it ignore the pointer
 * @param onHoverChange - Reports a mouse resting on the bar, which keeps the controls up
 */
export function ControlBar({
  videoRef,
  status,
  actions,
  duration,
  skips,
  sprite,
  prev,
  next,
  audio,
  preference,
  pip,
  fullscreen,
  openMenu,
  isVisible,
  isVolumeExpanded,
  onMenuOpenChange,
  onTogglePreference,
  onOpenShortcuts,
  onHoverChange,
  onFocus
}: Readonly<{
  videoRef: RefObject<HTMLVideoElement | null>
  status: LmpStatus
  actions: LmpActions
  duration: number
  skips: Content.Skip[]
  sprite: { src: string; grid: Content.SpriteGrid } | null
  prev: LmpProps["prev"]
  next: LmpProps["next"]
  audio: {
    tracks: LmpAudioTrack[]
    currentId: string
    onSelect: (track: LmpAudioTrack) => void
  }
  preference: PlaybackPreference
  pip: Toggle
  fullscreen: Toggle
  openMenu: LmpMenu | null
  isVisible: boolean
  isVolumeExpanded: boolean
  onMenuOpenChange: (menu: LmpMenu, isOpen: boolean) => void
  onTogglePreference: (key: keyof PlaybackPreference) => void
  onOpenShortcuts: () => void
  onHoverChange: (isHovering: boolean) => void
  onFocus: () => void
}>) {
  const progressRef = useRef<HTMLDivElement>(null)
  const [scrubTime, setScrubTime] = useState<number | null>(null)
  const isPlaying = status === "playing" || status === "buffering"
  const hasAudioMenu = audio.tracks.length > 1

  return (
    <div
      onPointerEnter={(event) => event.pointerType === "mouse" && onHoverChange(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && onHoverChange(false)}
      onFocus={onFocus}
      className={cls(
        "absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-linear-to-t from-black/85 via-black/50 to-transparent px-3 pt-20 pb-2 transition-opacity duration-200 sm:px-5 sm:pb-4",
        !isVisible && "pointer-events-none opacity-0"
      )}>
      <TimeDisplay videoRef={videoRef} duration={duration} scrubTime={scrubTime} />
      <div ref={progressRef}>
        <ProgressBar
          videoRef={videoRef}
          duration={duration}
          skips={skips}
          actions={actions}
          sprite={sprite}
          scrubTime={scrubTime}
          onScrub={setScrubTime}
        />
      </div>
      <div className='mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2'>
        <div className='flex items-center gap-1 justify-self-start'>
          {hasAudioMenu && (
            <AudioMenu
              tracks={audio.tracks}
              currentId={audio.currentId}
              anchorRef={progressRef}
              isOpen={openMenu === "audio"}
              onOpenChange={(isOpen) => onMenuOpenChange("audio", isOpen)}
              onSelect={audio.onSelect}
            />
          )}
          <VolumeControl actions={actions} isExpanded={isVolumeExpanded} />
        </div>
        <div className='flex items-center gap-1 sm:gap-4'>
          <TrackButton direction='prev' target={prev} onGo={actions.goTo} />
          <SeekButton offset={-10} onSeek={actions.seekBy} />
          <PlayButton isPlaying={isPlaying} onPress={actions.togglePlay} />
          <SeekButton offset={10} onSeek={actions.seekBy} />
          <TrackButton direction='next' target={next} onGo={actions.goTo} />
        </div>
        <div className='flex items-center gap-1 justify-self-end'>
          <PipButton
            isSupported={pip.isSupported}
            isActive={pip.isActive}
            onToggle={pip.onToggle}
          />
          <FullscreenButton
            isSupported={fullscreen.isSupported}
            isFullscreen={fullscreen.isActive}
            onToggle={fullscreen.onToggle}
          />
          <PreferencesMenu
            preference={preference}
            anchorRef={progressRef}
            isOpen={openMenu === "preferences"}
            onOpenChange={(isOpen) => onMenuOpenChange("preferences", isOpen)}
            onToggle={onTogglePreference}
            onOpenShortcuts={onOpenShortcuts}
          />
        </div>
      </div>
    </div>
  )
}
