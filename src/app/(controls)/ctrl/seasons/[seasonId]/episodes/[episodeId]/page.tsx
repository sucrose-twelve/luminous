import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import {
  ControlPage,
  PanelBody,
  TableCard
} from "@/app/(controls)/components/control-page"
import { Link } from "@/components/link"
import { buttonVariants } from "@/components/ui/button"
import { episodeTag, episodeTitle } from "@/libs/episode"
import { artTrack } from "@/libs/media"
import { seasonName } from "@/libs/season"
import { cls } from "@/libs/utils"

import { readControlEpisode } from "./actions/read"
import { EpisodeActions } from "./components/episode-actions"
import { EpisodeDetails } from "./components/episode-details"
import { TrackCards, trackSummary } from "./components/track-cards"

/**
 * The page blocks by design (plain SSR that reads the session), so it opts out of instant-navigation
 * validation.
 */
export const instant = false

type EpisodeParams = NextParams<{ seasonId: string; episodeId: string }>

/**
 * Both IDs are UUIDs, or the page is a 404.
 */
async function parseParams(params: EpisodeParams["params"]) {
  const { seasonId, episodeId } = await params
  const uuid = z.uuid()
  return uuid.safeParse(seasonId).success && uuid.safeParse(episodeId).success
    ? { seasonId, episodeId }
    : null
}

export async function generateMetadata({ params }: EpisodeParams): Promise<Metadata> {
  const ids = await parseParams(params)
  if (!ids) return {}

  const detail = await readControlEpisode(ids.seasonId, ids.episodeId)
  return detail
    ? {
        title: `${detail.content.title} – ${seasonName(detail.season)} ${episodeTag(detail.episode)}`
      }
    : {}
}

/**
 * An episode: its tracks as cards, its details, skips, and art in the side panel, and the skip editor and
 * thumbnail capture that work on its art track. Prev / Next step through the season, for setting skips episode
 * after episode.
 */
export default async function ControlEpisode({ params }: EpisodeParams) {
  const ids = await parseParams(params)
  if (!ids) notFound()

  const detail = await readControlEpisode(ids.seasonId, ids.episodeId)
  if (!detail) notFound()

  const { episode, season, content, tracks } = detail
  const tag = episodeTag(episode, " ")
  const track = artTrack(tracks)
  const duration = Math.max(0, ...tracks.map((item) => item.duration))
  const episodeHref = (id: string) => `/ctrl/seasons/${season.id}/episodes/${id}`

  return (
    <ControlPage
      title={episodeTitle(episode) ?? tag}
      description={`${content.title} · ${seasonName(season)} · ${tag}`}
      breadcrumbs={[
        { label: "Contents", href: "/ctrl/contents" },
        { label: content.title, href: `/ctrl/contents/${content.id}` },
        { label: seasonName(season), href: `/ctrl/seasons/${season.id}` },
        { label: tag }
      ]}
      actions={
        <EpisodeActions
          episode={{
            id: episode.id,
            episodeNo: episode.episodeNo,
            kind: episode.kind,
            title: episode.title,
            synopsis: episode.synopsis,
            airedOn: episode.airedOn
          }}
          skips={episode.skips}
          hasThumbnail={episode.thumbnail !== null}
          artTrackId={track?.id ?? null}
          duration={duration}
        />
      }
      aside={
        <PanelBody>
          <EpisodeDetails detail={detail} />
        </PanelBody>
      }>
      <TableCard
        toolbar={
          <div className='flex items-baseline gap-2.5'>
            <h2 className='text-xs font-semibold tracking-wide text-zinc-400 uppercase'>
              Tracks
            </h2>
            <span className='text-xs text-zinc-500'>
              {trackSummary(tracks, season.sources)}
            </span>
          </div>
        }
        footer={
          <div className='flex justify-between'>
            {detail.previous ? (
              <Link
                href={episodeHref(detail.previous.id)}
                className={cls(buttonVariants({ variant: "ghost" }))}>
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                Episode {detail.previous.episodeNo}
              </Link>
            ) : (
              <span />
            )}
            {detail.next ? (
              <Link
                href={episodeHref(detail.next.id)}
                className={cls(buttonVariants({ variant: "ghost" }))}>
                Episode {detail.next.episodeNo}
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Link>
            ) : null}
          </div>
        }>
        <TrackCards seasonId={season.id} tracks={tracks} sources={season.sources} />
      </TableCard>
    </ControlPage>
  )
}
