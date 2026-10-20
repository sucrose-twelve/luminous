"use client"

import { useImperativeHandle, useRef } from "react"

import { formatTime } from "@/libs/time"

import { spriteTile } from "../utils"

const SKIP_LABELS: Record<Content.Skip["kind"], string> = {
  intro: "Intro",
  outro: "Outro",
  recap: "Recap"
}

/**
 * Half the width of the time-only label, for keeping it inside the bar.
 */
const LABEL_HALF_WIDTH = 40

export type PreviewThumbnailHandle = {
  /**
   * Shows the preview for `time`, centered over `ratio` of the bar's width.
   */
  show: (time: number, ratio: number) => void
  hide: () => void
}

/**
 * The hover preview above the progress bar (`docs/design/01-Actions.png`): the sprite sheet tile for the time
 * under the pointer, with the time in a small label along its bottom edge, and the skip range's name above it
 * ("Intro"). Without a ready sprite sheet it is the time label alone.
 *
 * Driven through `ref` (`show` / `hide`) by the progress bar once per animation frame, writing the DOM
 * directly, so moving the pointer never re-renders React. The tile is a CSS background at its native size
 * (`spriteGrid`), not `next/image`, which would resize the whole sheet and break the tile offsets.
 *
 * @param sprite - The sheet's URL and layout, once it is preloaded; `null` shows the time only
 */
export function PreviewThumbnail({
  ref,
  duration,
  skips,
  sprite
}: Readonly<{
  ref: React.Ref<PreviewThumbnailHandle>
  duration: number
  skips: Content.Skip[]
  sprite: { src: string; grid: Content.SpriteGrid } | null
}>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const tileRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const skipRef = useRef<HTMLSpanElement>(null)
  const halfWidth = sprite ? sprite.grid.width / 2 : LABEL_HALF_WIDTH

  useImperativeHandle(
    ref,
    () => ({
      show: (time, ratio) => {
        const root = rootRef.current
        if (!root) return

        root.style.left = `clamp(${halfWidth}px, ${ratio * 100}%, calc(100% - ${halfWidth}px))`
        root.hidden = false
        if (timeRef.current) timeRef.current.textContent = formatTime(time, duration)

        const skip = skips.find((item) => item.from <= time && time < item.to)
        if (skipRef.current) {
          skipRef.current.hidden = !skip
          if (skip) skipRef.current.textContent = SKIP_LABELS[skip.kind]
        }

        if (sprite && tileRef.current) {
          const { x, y } = spriteTile(sprite.grid, time)
          tileRef.current.style.backgroundPosition = `-${x}px -${y}px`
        }
      },
      hide: () => {
        if (rootRef.current) rootRef.current.hidden = true
      }
    }),
    [halfWidth, duration, skips, sprite]
  )

  const timeLabel = (
    <span
      ref={timeRef}
      className='rounded-xs bg-black/75 px-1.5 py-0.5 text-xs text-white tabular-nums'
    />
  )

  return (
    <div
      ref={rootRef}
      hidden
      aria-hidden
      className='pointer-events-none absolute bottom-full mb-4 flex -translate-x-1/2 flex-col items-center gap-1.5'>
      <span
        ref={skipRef}
        hidden
        className='rounded-xs bg-black/70 px-1.5 py-0.5 text-[11px] text-white/80'
      />
      {sprite ? (
        <div
          ref={tileRef}
          className='relative flex items-end justify-center rounded-sm bg-black bg-no-repeat pb-1.5 shadow-lg ring-1 ring-white/25'
          style={{
            width: sprite.grid.width,
            height: sprite.grid.height,
            backgroundImage: `url(${sprite.src})`
          }}>
          {timeLabel}
        </div>
      ) : (
        timeLabel
      )}
    </div>
  )
}
