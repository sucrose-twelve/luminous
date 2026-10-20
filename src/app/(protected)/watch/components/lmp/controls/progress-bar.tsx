"use client"

import { clamp } from "es-toolkit"
import { useCallback, useEffect, useRef, type RefObject } from "react"

import { formatSpokenTime } from "@/libs/time"

import type { LmpActions } from "../types"
import { PreviewThumbnail, type PreviewThumbnailHandle } from "./preview-thumbnail"

const BUFFER_EVENTS = [
  "progress",
  "timeupdate",
  "seeked",
  "loadeddata",
  "emptied"
] as const

const BUFFERED_RANGE_CLASS = "absolute inset-y-0 bg-white/50"

/**
 * Buffered ranges as `[start, end]` pairs, rounded to 0.1 s, with a key that only changes when the drawn bar
 * would.
 */
function readBuffered(video: HTMLVideoElement) {
  const ranges: [number, number][] = []
  for (let i = 0; i < video.buffered.length; i++) {
    ranges.push([
      Math.round(video.buffered.start(i) * 10) / 10,
      Math.round(video.buffered.end(i) * 10) / 10
    ])
  }
  return { ranges, key: ranges.join("|") }
}

/**
 * The seek bar: played (theme color), buffered, and skip ranges, with a preview of the time under the pointer
 * (a sprite sheet tile when the episode has one, see `PreviewThumbnail`). With a mouse it follows hovering;
 * on touch it shows while dragging.
 *
 * A click seeks right away. A drag only moves the playhead and reports `onScrub`, then seeks once on release,
 * because every seek aborts the MSE fetch in flight. The played and buffered parts are drawn through refs, so
 * playback doesn't re-render this component; neither does moving the pointer, which updates the preview once
 * per frame.
 *
 * @param sprite - The episode's sprite sheet once preloaded, or `null`
 * @param scrubTime - The time being dragged to, or `null`
 * @param onScrub - Reports the drag position, `null` when the drag ends
 */
export function ProgressBar({
  videoRef,
  duration,
  skips,
  actions,
  sprite,
  scrubTime,
  onScrub
}: Readonly<{
  videoRef: RefObject<HTMLVideoElement | null>
  duration: number
  skips: Content.Skip[]
  actions: LmpActions
  sprite: { src: string; grid: Content.SpriteGrid } | null
  scrubTime: number | null
  onScrub: (time: number | null) => void
}>) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const playedRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const scrubRef = useRef<number | null>(null)
  const drawRef = useRef<() => void>(() => {})
  const wasPlayingRef = useRef(false)
  const previewRef = useRef<PreviewThumbnailHandle>(null)
  const previewFrameRef = useRef(0)
  const previewAtRef = useRef<{ ratio: number; time: number } | null>(null)
  const bufferedRef = useRef<HTMLDivElement>(null)

  const timeAt = useCallback(
    (clientX: number) => {
      const rect = sliderRef.current?.getBoundingClientRect()
      if (!rect?.width) return { ratio: 0, time: 0 }
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      return { ratio, time: ratio * duration }
    },
    [duration]
  )

  /**
   * Moves the preview on the next frame, however many pointer events arrive before it.
   */
  const showPreview = useCallback((position: { ratio: number; time: number }) => {
    previewAtRef.current = position
    if (previewFrameRef.current) return
    previewFrameRef.current = requestAnimationFrame(() => {
      previewFrameRef.current = 0
      const at = previewAtRef.current
      if (at) previewRef.current?.show(at.time, at.ratio)
    })
  }, [])

  const hidePreview = useCallback(() => {
    cancelAnimationFrame(previewFrameRef.current)
    previewFrameRef.current = 0
    previewAtRef.current = null
    previewRef.current?.hide()
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)

      const video = videoRef.current
      wasPlayingRef.current = Boolean(video && !video.paused)
      if (wasPlayingRef.current) actions.pause()
      const position = timeAt(event.clientX)
      scrubRef.current = position.time
      onScrub(position.time)
      showPreview(position)
    },
    [videoRef, actions, onScrub, timeAt, showPreview]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const position = timeAt(event.clientX)
      if (event.pointerType === "mouse" || scrubRef.current !== null)
        showPreview(position)
      if (scrubRef.current === null) return
      scrubRef.current = position.time
      onScrub(position.time)
    },
    [onScrub, timeAt, showPreview]
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (scrubRef.current === null) return
      actions.seekTo(timeAt(event.clientX).time)
      if (wasPlayingRef.current) actions.play()
      scrubRef.current = null
      onScrub(null)
      if (event.pointerType !== "mouse") hidePreview()
    },
    [actions, onScrub, timeAt, hidePreview]
  )

  const handlePointerLeave = useCallback(() => {
    if (scrubRef.current === null) hidePreview()
  }, [hidePreview])

  useEffect(() => () => cancelAnimationFrame(previewFrameRef.current), [])

  useEffect(() => {
    scrubRef.current = scrubTime
    drawRef.current()
  }, [scrubTime])

  /**
   * Draws the played part and the slider's ARIA values from the video, every frame while playing and on
   * each media event otherwise. Writes the DOM directly, so React doesn't re-render per frame.
   */
  useEffect(() => {
    const video = videoRef.current
    const slider = sliderRef.current
    if (!video || !slider) return

    let frame = 0
    let lastSecond = -1

    const draw = () => {
      const time = scrubRef.current ?? video.currentTime
      const ratio = duration > 0 ? clamp(time / duration, 0, 1) : 0
      if (playedRef.current) playedRef.current.style.transform = `scaleX(${ratio})`
      if (headRef.current) headRef.current.style.left = `${ratio * 100}%`

      const second = Math.floor(time)
      if (second !== lastSecond) {
        lastSecond = second
        slider.setAttribute("aria-valuenow", String(second))
        slider.setAttribute(
          "aria-valuetext",
          `${formatSpokenTime(second)} of ${formatSpokenTime(duration)}`
        )
      }
    }
    const loop = () => {
      draw()
      frame = requestAnimationFrame(loop)
    }
    const start = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(loop)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      draw()
    }

    const events = [
      "seeking",
      "seeked",
      "timeupdate",
      "loadedmetadata",
      "emptied"
    ] as const
    const stopEvents = ["pause", "waiting", "ended"] as const
    drawRef.current = draw
    events.forEach((event) => video.addEventListener(event, draw))
    stopEvents.forEach((event) => video.addEventListener(event, stop))
    video.addEventListener("playing", start)
    if (video.paused) draw()
    else start()

    return () => {
      cancelAnimationFrame(frame)
      drawRef.current = () => {}
      events.forEach((event) => video.removeEventListener(event, draw))
      stopEvents.forEach((event) => video.removeEventListener(event, stop))
      video.removeEventListener("playing", start)
    }
  }, [videoRef, duration])

  /**
   * Redraws the buffered ranges when they change (a fragment appended or evicted), as plain elements in a
   * container React leaves empty.
   */
  useEffect(() => {
    const video = videoRef.current
    const container = bufferedRef.current
    if (!video || !container || duration <= 0) return

    let lastKey: string | null = null
    const drawBuffered = () => {
      const { ranges, key } = readBuffered(video)
      if (key === lastKey) return
      lastKey = key
      container.replaceChildren(
        ...ranges.map(([from, to]) => {
          const range = document.createElement("div")
          range.className = BUFFERED_RANGE_CLASS
          range.style.left = `${(from / duration) * 100}%`
          range.style.width = `${((to - from) / duration) * 100}%`
          return range
        })
      )
    }

    drawBuffered()
    BUFFER_EVENTS.forEach((event) => video.addEventListener(event, drawBuffered))
    return () =>
      BUFFER_EVENTS.forEach((event) => video.removeEventListener(event, drawBuffered))
  }, [videoRef, duration])

  const isActive = scrubTime !== null

  return (
    <div
      ref={sliderRef}
      role='slider'
      tabIndex={0}
      aria-label='Seek'
      aria-valuemin={0}
      aria-valuemax={Math.floor(duration)}
      data-active={isActive || undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className='group/progress focus-visible:outline-theme relative flex h-4 cursor-pointer touch-none items-center outline-offset-4 select-none focus-visible:outline-2 max-sm:h-6'>
      <div className='relative h-1 w-full overflow-hidden rounded-full bg-white/30 transition-[height] group-hover/progress:h-1.5 group-data-active/progress:h-1.5'>
        <div ref={bufferedRef} className='absolute inset-0' />
        {skips.map((skip) => (
          <div
            key={`${skip.kind}-${skip.from}`}
            className='bg-theme/35 absolute inset-y-0'
            style={{
              left: `${(skip.from / duration) * 100}%`,
              width: `${((skip.to - skip.from) / duration) * 100}%`
            }}
          />
        ))}
        <div
          ref={playedRef}
          className='bg-theme absolute inset-0 origin-left'
          style={{ transform: "scaleX(0)" }}
        />
      </div>
      <div
        ref={headRef}
        className='bg-theme pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full transition-transform group-hover/progress:scale-100 group-focus-visible/progress:scale-100 group-data-active/progress:scale-100'
      />
      <PreviewThumbnail
        ref={previewRef}
        duration={duration}
        skips={skips}
        sprite={sprite}
      />
    </div>
  )
}
