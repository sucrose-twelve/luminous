import { EpisodeCardBody } from "@/components/episode-card"
import { episodeTag } from "@/libs/episode"

import type { LmpProps } from "../types"

export type PlaylistEpisode = LmpProps["playlist"]["episodes"][number]

/**
 * One episode card of the playlist, the same card as the content page's episode grid
 * (`docs/design/content-page.png`): thumbnail, `EP 01` (or `SP - 01`), title, and audio languages. The episode playing now
 * has the play mark.
 *
 * An episode without any track can't be picked (`aria-disabled`, still focusable so it can be read).
 *
 * @param title - The season's title, or the content's (as on the content page)
 * @param missingAudio - A note when the episode lacks the audio being played (`"No ไทย audio"`): it opens in
 * another language instead
 */
export function PlaylistItem({
  episode,
  title,
  isMovie,
  isCurrent,
  missingAudio,
  onSelect
}: Readonly<{
  episode: PlaylistEpisode
  title: string
  isMovie: boolean
  isCurrent: boolean
  missingAudio: string | null
  onSelect: (episode: PlaylistEpisode) => void
}>) {
  const isPlayable = episode.audios.length > 0

  return (
    <li>
      <button
        type='button'
        aria-current={isCurrent || undefined}
        aria-disabled={!isPlayable || undefined}
        onClick={isPlayable && !isCurrent ? () => onSelect(episode) : undefined}
        className='focus-visible:outline-theme flex w-full cursor-pointer gap-x-4 rounded-md text-left text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 aria-current:cursor-default aria-current:hover:opacity-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-40'>
        <EpisodeCardBody
          episodeId={episode.id}
          hasThumbnail={episode.hasThumbnail}
          label={isMovie ? "Movie" : episodeTag(episode, " ")}
          title={title}
          audios={episode.audios}
          mark={isCurrent ? "Now playing" : null}
          note={missingAudio}
        />
      </button>
    </li>
  )
}
