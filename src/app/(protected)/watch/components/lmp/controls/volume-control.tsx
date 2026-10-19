"use client"

import {
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMute02Icon
} from "@hugeicons/core-free-icons"
import { clamp } from "es-toolkit"
import { useCallback, useRef, useState } from "react"

import { cls } from "@/libs/utils"
import { usePlayerStore } from "@/stores/player"

import type { LmpActions } from "../types"
import { ControlButton } from "./control-button"

const VOLUME_STEP = 0.05

let canSetVolume: boolean | null = null

/**
 * iOS Safari ignores `volume` writes (the hardware buttons own it). Probe a detached element once, so the
 * player's own volume is never touched.
 */
function isVolumeSettable() {
  if (canSetVolume === null) {
    const probe = document.createElement("audio")
    probe.volume = 0.5
    canSetVolume = probe.volume === 0.5
  }
  return canSetVolume
}

/**
 * The speaker button (mute) with a volume slider that slides out on hover or focus and stays out while
 * dragged, or while `isExpanded` (the ↑ / ↓ shortcuts). The wheel over either changes the volume by 5 %.
 * Reads the store, which `<Lmp>` keeps in sync with the `<video>`.
 */
export function VolumeControl({
  actions,
  isExpanded
}: Readonly<{ actions: LmpActions; isExpanded: boolean }>) {
  const volume = usePlayerStore((state) => state.volume)
  const muted = usePlayerStore((state) => state.muted)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hasSlider] = useState(isVolumeSettable)
  const level = muted ? 0 : volume
  const icon =
    level === 0 ? VolumeMute02Icon : level <= 0.5 ? VolumeLowIcon : VolumeHighIcon

  const volumeAt = useCallback((clientX: number) => {
    const rect = sliderRef.current?.getBoundingClientRect()
    return rect?.width ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      setIsDragging(true)
      actions.setVolume(volumeAt(event.clientX))
    },
    [actions, volumeAt]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isDragging) actions.setVolume(volumeAt(event.clientX))
    },
    [actions, isDragging, volumeAt]
  )

  const handlePointerUp = useCallback(() => setIsDragging(false), [])

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (event.deltaY)
        actions.setVolume(level + (event.deltaY < 0 ? VOLUME_STEP : -VOLUME_STEP))
    },
    [actions, level]
  )

  return (
    <div
      className='group/volume flex items-center'
      onWheel={hasSlider ? handleWheel : undefined}>
      <ControlButton
        label={muted ? "Unmute (Shift+M)" : "Mute (Shift+M)"}
        icon={icon}
        onPress={actions.toggleMute}
      />
      {hasSlider && (
        <div
          className={cls(
            "w-0 overflow-hidden opacity-0 transition-[width,opacity] delay-300 duration-200 group-focus-within/volume:w-24 group-focus-within/volume:opacity-100 group-focus-within/volume:delay-0 group-hover/volume:w-24 group-hover/volume:opacity-100 group-hover/volume:delay-0",
            (isDragging || isExpanded) && "w-24 opacity-100 delay-0"
          )}>
          <div
            ref={sliderRef}
            role='slider'
            tabIndex={0}
            aria-label='Volume'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level * 100)}
            aria-valuetext={`${Math.round(level * 100)}%`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className='focus-visible:outline-theme relative mx-2 flex h-6 cursor-pointer touch-none items-center select-none focus-visible:outline-2'>
            <div className='h-1 w-full overflow-hidden rounded-full bg-white/30'>
              <div
                className='h-full origin-left bg-white'
                style={{ transform: `scaleX(${level})` }}
              />
            </div>
            <div
              className='pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white'
              style={{ left: `${level * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
