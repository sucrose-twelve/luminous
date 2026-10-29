"use client"

import { Image01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"
import { useCallback, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { captureThumbnail } from "@/actions/episodes/update"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ModalComponent } from "@/components/ui/modal"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import { Spinner } from "@/components/ui/spinner"
import type { OverlayState } from "@/hooks"

import { formatClock } from "../utils"

/**
 * Nudges for finding the exact frame, in seconds.
 */
const STEPS = [-1, -0.1, 0.1, 1] as const

/**
 * The Capture thumbnail modal: play the episode's art track, stop on a frame, and save it as the thumbnail. A
 * plain `<video>` (the stream route answers Range requests), not the player, so nothing is written to the watch
 * history. The current thumbnail skips the image optimizer, which would keep serving the old frame.
 *
 * @param trackId - The art track (`artTrack`), the same video `tests/track.spec.ts` grabs frames from
 */
export function ThumbnailCaptureModal({
  control,
  episodeId,
  trackId,
  hasThumbnail
}: Readonly<{
  control: OverlayState
  episodeId: string
  trackId: string
  hasThumbnail: boolean
}>) {
  return (
    <ModalComponent control={control} size='xl'>
      <ContentHeader
        icon={<HugeiconsIcon icon={Image01Icon} size={28} strokeWidth={1.6} />}
        title='Capture thumbnail'
        description='Stop the video on the frame you want, then capture it.'
      />
      <ThumbnailCapture
        control={control}
        episodeId={episodeId}
        trackId={trackId}
        hasThumbnail={hasThumbnail}
      />
    </ModalComponent>
  )
}

function ThumbnailCapture({
  control,
  episodeId,
  trackId,
  hasThumbnail
}: Readonly<{
  control: OverlayState
  episodeId: string
  trackId: string
  hasThumbnail: boolean
}>) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [time, setTime] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setTime(videoRef.current.currentTime)
  }, [])

  const handleStep = useCallback((step: number) => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    video.currentTime = Math.min(
      Math.max(video.currentTime + step, 0),
      video.duration || 0
    )
  }, [])

  const handleCapture = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    const seconds = video.currentTime

    setMessage(null)
    startTransition(async () => {
      const result = await captureThumbnail(episodeId, seconds)
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      control.close()
      toast.success(`Thumbnail captured at ${formatClock(seconds)}`, {
        description: "Browsers may show the old image for up to a day."
      })
    })
  }, [control, episodeId])

  return (
    <>
      <div className='flex flex-col gap-4 px-4 py-6 sm:px-8'>
        <video
          ref={videoRef}
          src={`/api/stream/${trackId}`}
          className='aspect-video w-full rounded-lg bg-black'
          controls
          muted
          preload='metadata'
          onTimeUpdate={handleTimeUpdate}
          onSeeked={handleTimeUpdate}
        />

        <div className='flex items-center justify-between gap-4'>
          <span className='font-mono text-sm tabular-nums'>
            {formatClock(time)}
            <span className='text-zinc-500'>.{Math.floor((time % 1) * 10)}</span>
          </span>
          <div className='flex gap-1'>
            {STEPS.map((step) => (
              <Button
                key={step}
                variant='outline'
                size='sm'
                className='font-mono'
                onClick={() => handleStep(step)}>
                {step > 0 ? `+${step}s` : `${step}s`}
              </Button>
            ))}
          </div>
        </div>

        {hasThumbnail ? (
          <div className='flex items-center gap-3 text-xs text-zinc-400'>
            <Image
              src={`/api/art/thumbnail/${episodeId}`}
              alt='Current thumbnail'
              width={128}
              height={72}
              unoptimized
              className='aspect-video w-32 rounded-md bg-zinc-800 object-cover'
            />
            Current thumbnail, replaced on capture.
          </div>
        ) : null}

        {message ? (
          <Alert variant='destructive'>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <ContentFooter onClose={isPending ? undefined : control.close}>
        <Button
          size='lg'
          className='rounded-sm px-4'
          disabled={isPending}
          onClick={handleCapture}>
          {isPending ? <Spinner /> : null}
          <span className='uppercase'>capture this frame</span>
        </Button>
      </ContentFooter>
    </>
  )
}
