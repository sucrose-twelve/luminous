import Image from "next/image"

import { ClampedText } from "@/app/(controls)/components/clamped-text"
import { PanelSection } from "@/app/(controls)/components/control-page"
import {
  DetailList,
  DetailRow,
  PathValue,
  ShortId
} from "@/app/(controls)/components/detail-list"
import { SeasonStatusBadge } from "@/app/(controls)/components/season-badges"
import { formatDate } from "@/app/(controls)/utils"
import { Link } from "@/components/link"
import { EPISODE_KIND_LABELS, SEASON_KIND_LABELS, SKIP_KIND_LABELS } from "@/constants"
import { seasonName } from "@/libs/season"

import type { ControlEpisode } from "../actions/read"
import { formatClock } from "../utils"

/**
 * An episode's side panel: its season in brief, then the episode, its skips, and its art.
 */
export function EpisodeDetails({ detail }: Readonly<{ detail: ControlEpisode }>) {
  const { episode, season, content } = detail

  return (
    <>
      <PanelSection title='Season'>
        <div className='flex gap-3'>
          <Image
            className='aspect-2/3 h-24 w-16 shrink-0 rounded-md bg-zinc-800 object-cover'
            alt=''
            src={`/api/art/poster/${season.id}`}
            width={64}
            height={96}
          />
          <div className='flex min-w-0 flex-col gap-1 text-sm'>
            <Link
              href={`/ctrl/seasons/${season.id}`}
              className='truncate font-medium hover:underline'>
              {seasonName(season)}
            </Link>
            <span className='truncate text-zinc-400'>{content.title}</span>
            <span className='text-xs text-zinc-500'>
              {SEASON_KIND_LABELS[season.kind]} · {formatDate(season.releasedOn)}
            </span>
            <SeasonStatusBadge status={season.status} />
          </div>
        </div>
      </PanelSection>

      <PanelSection title='Episode'>
        {episode.thumbnail ? (
          <Image
            className='aspect-video w-full rounded-lg bg-zinc-800 object-cover'
            alt=''
            src={`/api/art/thumbnail/${episode.id}`}
            width={280}
            height={158}
          />
        ) : (
          <div className='flex aspect-video w-full items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-500'>
            No thumbnail
          </div>
        )}
        <DetailList>
          <DetailRow label='ID'>
            <ShortId id={episode.id} />
          </DetailRow>
          <DetailRow label='No.'>{episode.episodeNo}</DetailRow>
          <DetailRow label='Kind'>{EPISODE_KIND_LABELS[episode.kind]}</DetailRow>
          <DetailRow label='Title'>{episode.title ?? "—"}</DetailRow>
          <DetailRow label='Aired on'>
            {episode.airedOn ? formatDate(episode.airedOn) : "—"}
          </DetailRow>
        </DetailList>
      </PanelSection>

      <PanelSection title='Skips'>
        {episode.skips.length ? (
          <DetailList>
            {episode.skips.map((skip) => (
              <DetailRow key={skip.kind} label={SKIP_KIND_LABELS[skip.kind]}>
                <span className='font-mono text-xs'>
                  {formatClock(skip.from)} – {formatClock(skip.to)}
                </span>
              </DetailRow>
            ))}
          </DetailList>
        ) : (
          <p className='text-sm text-zinc-500'>No skips</p>
        )}
      </PanelSection>

      <PanelSection title='Art'>
        <DetailList>
          <DetailRow label='Sprite sheet'>
            {episode.spriteGrid
              ? `${episode.spriteGrid.count} tiles · every ${episode.spriteGrid.interval}s`
              : "Not generated"}
          </DetailRow>
          {episode.thumbnail ? (
            <DetailRow label='Thumbnail' stacked>
              <PathValue path={episode.thumbnail} label='Thumbnail path' />
            </DetailRow>
          ) : null}
        </DetailList>
      </PanelSection>

      <PanelSection title='Synopsis'>
        {episode.synopsis ? (
          <ClampedText text={episode.synopsis} />
        ) : (
          <p className='text-sm text-zinc-500'>—</p>
        )}
      </PanelSection>
    </>
  )
}
