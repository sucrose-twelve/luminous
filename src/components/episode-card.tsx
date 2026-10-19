import { AudioWave01Icon, PlaySquareIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"

import type { Locales } from "@/constants/enum"
import { audiosLabel, languageCode } from "@/libs/language"

/**
 * The inside of an episode card (`docs/design/content-page.png`): thumbnail, `EP 01`, title, and the audio
 * languages it plays in. Shared by the content page's episode grid and the player's playlist; each wraps it
 * in its own link or button (a `flex gap-x-4` row).
 *
 * @param label - `EP 01`, or `Movie`
 * @param mark - Leads the label with the theme-colored play mark, read out as this text (`Continue watching`,
 * `Now playing`); `null` for none
 * @param note - A short note after the audio languages, e.g. that the language being played is missing
 */
export function EpisodeCardBody({
  episodeId,
  hasThumbnail,
  label,
  title,
  audios,
  mark = null,
  note = null
}: Readonly<{
  episodeId: string
  hasThumbnail: boolean
  label: string
  title: string
  audios: readonly { language: Locales; isDubbed: boolean }[]
  mark?: string | null
  note?: string | null
}>) {
  return (
    <>
      <span className='relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-zinc-800'>
        {hasThumbnail ? (
          <Image
            className='object-cover object-center'
            src={`/api/art/thumbnail/${episodeId}`}
            alt=''
            sizes='112px'
            fill
            loading='eager'
          />
        ) : null}
      </span>

      <span className='flex min-w-0 flex-col justify-center gap-y-1'>
        <span className='flex items-center gap-x-1.5 font-bold'>
          {mark ? (
            <span className='text-theme'>
              <HugeiconsIcon
                icon={PlaySquareIcon}
                color='currentColor'
                size={18}
                strokeWidth={2}
              />
              <span className='sr-only'>{mark}:</span>
            </span>
          ) : null}
          {label}
        </span>
        <span className='line-clamp-1 text-sm text-zinc-200'>{title}</span>

        {audios.length ? (
          <span className='flex flex-wrap items-center gap-x-2.5 text-[0.6875rem] text-zinc-400'>
            <span className='text-theme' aria-hidden>
              <HugeiconsIcon
                icon={AudioWave01Icon}
                color='currentColor'
                size={14}
                strokeWidth={2}
              />
            </span>
            {audios.map((audio) => (
              <span key={audio.language} aria-hidden>
                {languageCode(audio.language)}
              </span>
            ))}
            <span className='sr-only'>Audio: {audiosLabel(audios)}</span>
            {note ? <span className='text-zinc-500'>{note}</span> : null}
          </span>
        ) : (
          <span className='text-[0.6875rem] text-zinc-500'>No audio yet</span>
        )}
      </span>
    </>
  )
}
