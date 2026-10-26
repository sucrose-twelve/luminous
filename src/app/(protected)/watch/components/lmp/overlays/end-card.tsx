"use client"

import Image from "next/image"
import { useEffect, useId, useRef } from "react"

import { PlayIcon, ReplayIcon } from "@/app/(protected)/watch/components/lmp/icons"
import { cls } from "@/libs/utils"

import type { LmpAdjacent } from "../types"
import { episodeLabel, languageLabel, withEpisodeTitle } from "../utils"

const BUTTON =
  "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap text-black transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0"
const PRIMARY_BUTTON = cls(BUTTON, "bg-white/90 hover:bg-white focus-visible:bg-white")
const SECONDARY_BUTTON = cls(
  BUTTON,
  "bg-white/45 hover:bg-white/60 focus-visible:bg-white/60"
)

/**
 * The card at the bottom right once an episode has ended (`docs/design/LMP.png`, `notes` §8.3, §8.4):
 *
 * - a next episode in this language → "Up next in 5s", counting down to it while `deadline` is set
 *   (Autoplay Next), with Play now / Cancel; without a countdown, "Up next" with Play now / Replay
 * - only a next episode in another language (`fallback`) → asks: "EP07 isn't available in ไทย yet", with
 *   Watch in Original / Replay, never counting down
 * - neither → nothing: the Play button in the middle of the player replays
 *
 * While the card shows, the other controls stay hidden until there's activity (`lmp-session.tsx`).
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
  if (!target) return null

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
      className='border-gradient pointer-events-auto w-60 rounded-xl bg-black/50 p-3 text-white backdrop-blur-xl sm:w-64'>
      <div className='relative hidden aspect-video overflow-hidden rounded-lg bg-white/10 [@media(min-height:520px)]:block'>
        <Image
          src={`/api/art/thumbnail/${target.episodeId}`}
          alt=''
          fill
          sizes='256px'
          className='object-cover'
        />
      </div>
      <p className='text-sm [@media(min-height:520px)]:mt-2.5'>
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
      <h2 id={titleId} className='mt-0.5 line-clamp-2 text-xs text-white/60'>
        {heading}
      </h2>
      <div className='mt-3 grid grid-cols-2 gap-2'>
        {next ? (
          <button type='button' onClick={() => onGo(next)} className={PRIMARY_BUTTON}>
            <PlayIcon />
            Play now
          </button>
        ) : (
          <button
            type='button'
            onClick={() => onGo(target)}
            className={cls(PRIMARY_BUTTON, "col-span-2")}>
            Watch in {languageLabel(target.language, target.isDubbed)}
          </button>
        )}
        {next && deadline !== null ? (
          <button type='button' onClick={onCancel} className={SECONDARY_BUTTON}>
            Cancel
          </button>
        ) : (
          <button
            type='button'
            onClick={onReplay}
            className={cls(SECONDARY_BUTTON, !next && "col-span-2")}>
            <ReplayIcon />
            Replay
          </button>
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
 * "Up next in 5s", counting down through a ref.
 */
function CountdownLabel({ deadline }: Readonly<{ deadline: number }>) {
  const secondsRef = useRef<HTMLSpanElement>(null)

  useCountdownFrame(deadline, (remaining) => {
    if (secondsRef.current)
      secondsRef.current.textContent = String(Math.ceil(remaining / 1_000))
  })

  return (
    <>
      Up next in <span ref={secondsRef} className='tabular-nums' />s
    </>
  )
}
