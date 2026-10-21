import { Alert02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { MediaSourceError } from "../hooks/use-media-source"

const MESSAGES: Record<MediaSourceError, { title: string; message: string }> = {
  unauthorized: {
    title: "Your session has expired",
    message: "Reload the page to sign in again."
  },
  playback: {
    title: "This video can't be played",
    message: "The file couldn't be loaded or decoded."
  }
}

/**
 * Shown over the player when playback can't go on: the stream answered `401`, or native playback (the last
 * fallback) failed too.
 */
export function PlaybackError({ error }: Readonly<{ error: MediaSourceError }>) {
  const { title, message } = MESSAGES[error]

  return (
    <div className='absolute inset-0 grid place-items-center bg-black/70 px-4'>
      <div
        role='alert'
        className='border-gradient flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-neutral-900/80 px-6 py-8 text-center backdrop-blur-xl'>
        <HugeiconsIcon
          icon={Alert02Icon}
          size={40}
          strokeWidth={1.5}
          className='text-zinc-400'
        />
        <h2 className='text-lg font-medium text-white'>{title}</h2>
        <p className='text-sm text-zinc-400'>{message}</p>
        <button
          type='button'
          onClick={() => window.location.reload()}
          className='bg-theme hover:bg-theme-400 focus-visible:bg-theme-400 mt-3 cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-black transition-colors'>
          Reload
        </button>
      </div>
    </div>
  )
}
