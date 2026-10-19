"use client"

import type { RefObject } from "react"

import { useVideoEvent } from "../hooks/use-video-event"
import { formatTime } from "../utils"

const TIME_EVENTS = [
  "timeupdate",
  "seeking",
  "seeked",
  "loadedmetadata",
  "emptied"
] as const

/**
 * Elapsed time (left) and duration (right) above the progress bar. The only part of the player that
 * re-renders while playing, once per second.
 *
 * @param scrubTime - The time under the pointer while the progress bar is dragged, shown instead
 */
export function TimeDisplay({
  videoRef,
  duration,
  scrubTime
}: Readonly<{
  videoRef: RefObject<HTMLVideoElement | null>
  duration: number
  scrubTime: number | null
}>) {
  const seconds = useVideoEvent(
    videoRef,
    TIME_EVENTS,
    (video) => Math.floor(video.currentTime),
    0
  )

  return (
    <div className='flex justify-between text-[13px] text-white/90 tabular-nums'>
      <span>{formatTime(scrubTime ?? seconds, duration)}</span>
      <span>{formatTime(duration, duration)}</span>
    </div>
  )
}
