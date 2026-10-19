"use client"

import { Button } from "@heroui/react"
import { PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"

/**
 * The big Play button, over the episode poster after Stop, or alone over the video when the browser refused
 * to start playback on its own (autoplay policy).
 */
export function StoppedOverlay({
  episodeId,
  isStopped,
  onPlay
}: Readonly<{ episodeId: string; isStopped: boolean; onPlay: () => void }>) {
  return (
    <div className='absolute inset-0 grid place-items-center'>
      {isStopped && (
        <Image
          src={`/api/art/thumbnail/${episodeId}`}
          alt=''
          fill
          sizes='100vw'
          className='bg-black object-contain'
        />
      )}
      <Button
        isIconOnly
        variant='ghost'
        aria-label='Play (Space)'
        onPress={onPlay}
        className='data-[focus-visible=true]:ring-theme size-20 rounded-full bg-black/50 text-white ring-2 ring-white/90 backdrop-blur-sm transition-transform data-[hovered=true]:scale-105 data-[hovered=true]:bg-black/50 data-[pressed=true]:bg-black/50'>
        <HugeiconsIcon icon={PlayIcon} strokeWidth={1.5} className='m-0 size-9' />
      </Button>
    </div>
  )
}
