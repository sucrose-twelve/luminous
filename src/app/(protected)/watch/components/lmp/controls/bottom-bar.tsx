"use client"

import { useState, type RefObject } from "react"

import { cls } from "@/libs/utils"

import type { LmpActions } from "../types"
import { ProgressBar } from "./progress-bar"
import { TimeDisplay } from "./time-display"

/**
 * The bottom of the player (`docs/design/LMP.png`): elapsed time and duration over the progress bar. While
 * the bar is dragged, the elapsed time follows the drag. Only the progress bar takes the pointer, so a tap on
 * the rest still reaches the video (and hides the controls).
 *
 * @param sprite - The episode's sprite sheet once preloaded, for the hover preview, or `null`
 * @param isVisible - `false` fades it out (auto-hide) and makes the progress bar ignore the pointer
 * @param onHoverChange - Reports a mouse resting on the progress bar, which keeps the controls up
 */
export function BottomBar({
  videoRef,
  duration,
  skips,
  sprite,
  actions,
  isVisible,
  onHoverChange,
  onFocus
}: Readonly<{
  videoRef: RefObject<HTMLVideoElement | null>
  duration: number
  skips: Content.Skip[]
  sprite: { src: string; grid: Content.SpriteGrid } | null
  actions: LmpActions
  isVisible: boolean
  onHoverChange: (isHovering: boolean) => void
  onFocus: () => void
}>) {
  const [scrubTime, setScrubTime] = useState<number | null>(null)

  return (
    <div
      onPointerEnter={(event) => event.pointerType === "mouse" && onHoverChange(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && onHoverChange(false)}
      onFocus={onFocus}
      className={cls(
        "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-linear-to-t from-black/60 via-black/20 to-transparent px-4 pt-16 pb-3 transition-opacity duration-200 sm:gap-2.5 sm:px-8 sm:pb-7",
        !isVisible && "opacity-0"
      )}>
      <TimeDisplay videoRef={videoRef} duration={duration} scrubTime={scrubTime} />
      <div className={cls(isVisible && "pointer-events-auto")}>
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
    </div>
  )
}
