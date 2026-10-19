"use client"

import { Button } from "@heroui/react"
import { PlayIcon, ReplayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"
import { useEffect, useId, useRef } from "react"

import { cls } from "@/libs/utils"

import { AUTOPLAY_COUNTDOWN } from "../hooks/use-autoplay-next"
import type { LmpAdjacent } from "../types"
import { episodeLabel, languageLabel, withEpisodeTitle } from "../utils"

const RING_RADIUS = 22
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

const PRIMARY_BUTTON =
  "data-[focus-visible=true]:ring-theme w-full rounded-md bg-white text-black data-[hovered=true]:bg-white/85 data-[pressed=true]:bg-white/85"
const SECONDARY_BUTTON =
  "data-[focus-visible=true]:ring-theme w-full rounded-md bg-white/10 text-white data-[hovered=true]:bg-white/20 data-[pressed=true]:bg-white/20"

/**
 * What the player shows once an episode has ended (`notes` §8.3, §8.4):
 *
 * - a next episode in this language → "Up next", counting down to it while `deadline` is set (Autoplay Next),
 *   with Play now / Cancel; without a countdown, Play now / Replay
 * - only a next episode in another language (`fallback`) → asks: "EP07 isn't available in ไทย yet", with Watch
 *   in Original / Replay, never counting down
 * - neither → a Replay button
 *
 * @param audio - The track that just played, to name the missing language
 * @param hasSeasons - The content has more than one season, so labels carry the season (`S2 EP01`)
 * @param deadline - When the countdown opens `next` (epoch ms), or `null` when not counting
 */
export function EndCard({
  next,
  fallback,
  audio,
  hasSeasons,
  deadline,
  onGo,
  onReplay,
  onCancel
}: Readonly<{
  next: LmpAdjacent | null
  fallback: LmpAdjacent | null
  audio: { language: string; isDubbed: boolean }
  hasSeasons: boolean
  deadline: number | null
  onGo: (target: LmpAdjacent) => void
  onReplay: () => void
  onCancel: () => void
}>) {
  const titleId = useId()
  const target = next ?? fallback

  if (!target) {
    return (
      <div className='absolute inset-0 grid place-items-center'>
        <Button
          variant='ghost'
          onPress={onReplay}
          className='group data-[focus-visible=true]:ring-theme pointer-events-auto h-auto flex-col gap-2 rounded-xl p-1 text-base text-white data-[hovered=true]:bg-transparent data-[pressed=true]:bg-transparent'>
          <span className='grid size-20 place-items-center rounded-full bg-black/50 ring-2 ring-white/90 backdrop-blur-sm transition-transform group-data-[hovered=true]:scale-105'>
            <HugeiconsIcon icon={ReplayIcon} strokeWidth={1.5} className='m-0 size-8.5' />
          </span>
          <span className='rounded-full bg-black/50 px-3 py-0.5 font-medium backdrop-blur-sm'>
            Replay
          </span>
        </Button>
      </div>
    )
  }

  const label = episodeLabel(
    target,
    { kind: target.seasonKind, seasonNo: target.seasonNo },
    hasSeasons
  )
  const heading = next
    ? withEpisodeTitle(label, next)
    : `${label} isn't available in ${languageLabel(audio.language, true)} yet`

  return (
    <section
      aria-labelledby={titleId}
      className='pointer-events-auto w-72 rounded-md bg-black/75 p-3 text-white ring-1 ring-white/10 backdrop-blur-md sm:w-80'>
      <div className='relative hidden aspect-video overflow-hidden rounded-sm bg-white/10 [@media(min-height:520px)]:block'>
        <Image
          src={`/api/art/thumbnail/${target.episodeId}`}
          alt=''
          fill
          sizes='320px'
          className='object-cover'
        />
        {next && deadline !== null && (
          <Button
            variant='ghost'
            aria-label='Play now'
            onPress={() => onGo(next)}
            className='data-[focus-visible=true]:ring-theme absolute inset-0 size-full rounded-none bg-black/30 p-0 data-[hovered=true]:bg-black/30 data-[pressed=true]:transform-none data-[pressed=true]:bg-black/30'>
            <CountdownRing deadline={deadline} />
          </Button>
        )}
      </div>
      <p className='mt-1 text-xs text-white/60 [@media(min-height:520px)]:mt-3'>
        {next ? (
          deadline !== null ? (
            <CountdownLabel deadline={deadline} />
          ) : (
            "Up next"
          )
        ) : (
          "Next episode"
        )}
      </p>
      <h2 id={titleId} className='mt-0.5 line-clamp-2 font-medium'>
        {heading}
      </h2>
      <div className='mt-3 grid grid-cols-2 gap-2'>
        {next ? (
          <Button onPress={() => onGo(next)} className={PRIMARY_BUTTON}>
            <HugeiconsIcon icon={PlayIcon} size={16} strokeWidth={2} />
            Play now
          </Button>
        ) : (
          <Button
            onPress={() => onGo(target)}
            className={cls(PRIMARY_BUTTON, "col-span-2")}>
            Watch in {languageLabel(target.language, target.isDubbed)}
          </Button>
        )}
        {next && deadline !== null ? (
          <Button onPress={onCancel} className={SECONDARY_BUTTON}>
            Cancel
          </Button>
        ) : (
          <Button
            onPress={onReplay}
            className={cls(SECONDARY_BUTTON, !next && "col-span-2")}>
            <HugeiconsIcon icon={ReplayIcon} size={16} strokeWidth={1.5} />
            Replay
          </Button>
        )}
      </div>
    </section>
  )
}

/**
 * Calls `onFrame` with the milliseconds left until `deadline` on every animation frame until it passes. Frames
 * pause in a hidden tab; the countdown's own timer doesn't, so this only draws.
 */
function useCountdownFrame(deadline: number, onFrame: (remaining: number) => void) {
  const onFrameRef = useRef(onFrame)

  useEffect(() => {
    onFrameRef.current = onFrame
  })

  useEffect(() => {
    let frame = 0
    const draw = () => {
      const remaining = Math.max(deadline - Date.now(), 0)
      onFrameRef.current(remaining)
      if (remaining > 0) frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [deadline])
}

/**
 * A ring that empties as the countdown runs, around a play mark. Drawn through a ref, not React state.
 */
function CountdownRing({ deadline }: Readonly<{ deadline: number }>) {
  const circleRef = useRef<SVGCircleElement>(null)

  useCountdownFrame(deadline, (remaining) => {
    circleRef.current?.setAttribute(
      "stroke-dashoffset",
      String(RING_LENGTH * (1 - remaining / AUTOPLAY_COUNTDOWN))
    )
  })

  return (
    <span className='relative grid size-14 place-items-center rounded-full bg-black/50 text-white'>
      <svg
        viewBox='0 0 52 52'
        className='absolute inset-0 m-0 size-full -rotate-90'
        aria-hidden>
        <circle
          cx='26'
          cy='26'
          r={RING_RADIUS}
          fill='none'
          stroke='currentColor'
          strokeOpacity={0.25}
          strokeWidth={3}
        />
        <circle
          ref={circleRef}
          cx='26'
          cy='26'
          r={RING_RADIUS}
          fill='none'
          stroke='currentColor'
          strokeWidth={3}
          strokeLinecap='round'
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={0}
          className='text-theme'
        />
      </svg>
      <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className='m-0 size-5.5' />
    </span>
  )
}

/**
 * "Up next in 5 s", counting down through a ref.
 */
function CountdownLabel({ deadline }: Readonly<{ deadline: number }>) {
  const secondsRef = useRef<HTMLSpanElement>(null)

  useCountdownFrame(deadline, (remaining) => {
    if (secondsRef.current)
      secondsRef.current.textContent = String(Math.ceil(remaining / 1_000))
  })

  return (
    <>
      Up next in <span ref={secondsRef} className='tabular-nums' /> s
    </>
  )
}
