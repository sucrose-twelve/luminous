import { EpisodeCardBody } from "@/components/episode-card"
import { Link } from "@/components/link"
import { episodeTag } from "@/libs/episode"

import type { SeasonEpisode } from "../actions/read"

/**
 * One episode of the grid. Links to the player, not prefetched, so a full grid doesn't make the server render
 * every watch page.
 *
 * An episode without any track can't be opened (`aria-disabled`, dimmed), like in the player's playlist.
 *
 * @param isMovie - The season is a movie: the label reads `Movie` instead of `EP 01` (or `SP - 01`)
 * @param isResume - The account stopped partway through this episode: a play mark leads the label
 */
export function EpisodeCard({
  episode,
  title,
  isMovie,
  isResume
}: Readonly<{
  episode: SeasonEpisode
  title: string
  isMovie: boolean
  isResume: boolean
}>) {
  const isPlayable = episode.audios.length > 0

  const body = (
    <EpisodeCardBody
      episodeId={episode.id}
      hasThumbnail={episode.hasThumbnail}
      label={isMovie ? "Movie" : episodeTag(episode, " ")}
      title={title}
      audios={episode.audios}
      mark={isResume ? "Continue watching" : null}
    />
  )

  return isPlayable ? (
    <Link
      className='flex gap-x-4 rounded-md transition-opacity hover:opacity-80'
      href={`/watch?vid=${episode.id}`}
      prefetch={false}>
      {body}
    </Link>
  ) : (
    <div className='flex cursor-not-allowed gap-x-4 rounded-md opacity-40' aria-disabled>
      {body}
    </div>
  )
}
