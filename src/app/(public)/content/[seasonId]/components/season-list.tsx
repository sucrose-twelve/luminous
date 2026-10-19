import type { SeasonDetail } from "../actions/read"
import { SeasonCard } from "./season-card"

/**
 * The sidebar: the content's other seasons (the current one left out), by release date.
 */
export function SeasonList({
  seasons,
  contentTitle
}: Readonly<{ seasons: SeasonDetail["otherSeasons"]; contentTitle: string }>) {
  return (
    <aside>
      <h2 className='sr-only'>Other seasons</h2>
      <ul className='grid gap-3 sm:grid-cols-2 lg:grid-cols-1'>
        {seasons.map((season) => (
          <li key={season.id}>
            <SeasonCard season={season} contentTitle={contentTitle} />
          </li>
        ))}
      </ul>
    </aside>
  )
}
