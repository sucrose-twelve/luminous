import type { SeasonEpisode } from "../actions/read"
import { EpisodeCard } from "./episode-card"

/**
 * The Episodes section: every episode of the season in a grid, or a note while none is imported yet.
 *
 * @param resumeEpisodeId - The episode the account stopped partway through, or `null`
 */
export function EpisodeGrid({
  episodes,
  title,
  isMovie,
  resumeEpisodeId
}: Readonly<{
  episodes: readonly SeasonEpisode[]
  title: string
  isMovie: boolean
  resumeEpisodeId: string | null
}>) {
  return (
    <section>
      <h2 className='pb-5 text-lg font-bold'>Episodes</h2>

      {episodes.length ? (
        <ul className='grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3'>
          {episodes.map((episode) => (
            <li key={episode.id}>
              <EpisodeCard
                title={title}
                episode={episode}
                isMovie={isMovie}
                isResume={episode.id === resumeEpisodeId}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-sm text-zinc-500'>No episodes yet</p>
      )}
    </section>
  )
}
