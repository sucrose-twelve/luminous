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
import { Badge } from "@/components/ui/badge"
import { SEASON_KIND_LABELS } from "@/constants"
import { languageName } from "@/libs/language"
import { seasonName } from "@/libs/season"

import type { ControlSeason } from "../actions/read"

/**
 * A season's side panel: poster, every field, and each source with whether it is on disk and how many of the
 * season's episodes have a track from it.
 */
export function SeasonDetails({ season: detail }: Readonly<{ season: ControlSeason }>) {
  const { season, content } = detail

  return (
    <>
      <div className='flex flex-col gap-3'>
        <Image
          className='aspect-2/3 w-full rounded-xl bg-zinc-800 object-cover'
          alt=''
          src={`/api/art/poster/${season.id}`}
          width={280}
          height={420}
          preload
        />
        <div className='flex flex-col gap-0.5'>
          <span className='font-semibold'>{seasonName(season)}</span>
          {season.title && season.title !== seasonName(season) ? (
            <span className='text-sm text-zinc-400'>{season.title}</span>
          ) : null}
          <Link
            href={`/ctrl/contents/${content.id}`}
            className='text-sm text-zinc-400 hover:text-white hover:underline'>
            {content.title}
          </Link>
        </div>
      </div>

      <PanelSection title='Details'>
        <DetailList>
          <DetailRow label='ID'>
            <ShortId id={season.id} />
          </DetailRow>
          <DetailRow label='Kind'>{SEASON_KIND_LABELS[season.kind]}</DetailRow>
          <DetailRow label='Season no.'>{season.seasonNo ?? "—"}</DetailRow>
          <DetailRow label='Status'>
            <SeasonStatusBadge status={season.status} />
          </DetailRow>
          <DetailRow label='Released on'>{formatDate(season.releasedOn)}</DetailRow>
          <DetailRow label='Episodes'>{detail.episodes}</DetailRow>
          <DetailRow label='Created'>{formatDate(season.createdAt)}</DetailRow>
          <DetailRow label='Updated'>
            {season.updatedAt ? formatDate(season.updatedAt) : "—"}
          </DetailRow>
        </DetailList>
      </PanelSection>

      <PanelSection title='Sources'>
        <ul className='flex flex-col gap-3'>
          {detail.sources.map((source) => (
            <li key={source.language} className='flex flex-col gap-1.5'>
              <div className='flex flex-wrap items-center gap-1.5 text-sm'>
                <span className='font-medium'>{languageName(source.language)}</span>
                <Badge variant={source.isDubbed ? "outline" : "secondary"}>
                  {source.isDubbed ? "Dub" : "Original"}
                </Badge>
                {source.isOnDisk ? null : (
                  <Badge className='bg-amber-500/15 text-amber-300'>Not found</Badge>
                )}
                <span className='ml-auto text-xs text-zinc-400 tabular-nums'>
                  {source.tracks} / {detail.episodes} episodes
                </span>
              </div>
              <PathValue path={source.pathname} />
            </li>
          ))}
        </ul>
      </PanelSection>

      <PanelSection title='Poster'>
        <PathValue path={season.poster} label='Poster path' />
      </PanelSection>

      <PanelSection title='Art folder'>
        {detail.artDirectory ? (
          <PathValue path={detail.artDirectory} label='Art folder' />
        ) : (
          <p className='text-xs text-amber-300'>
            The primary source isn&apos;t inside the content&apos;s folder, so this season
            can&apos;t be imported.
          </p>
        )}
      </PanelSection>

      <PanelSection title='Synopsis'>
        {season.synopsis ? (
          <ClampedText text={season.synopsis} />
        ) : (
          <p className='text-sm text-zinc-500'>—</p>
        )}
      </PanelSection>
    </>
  )
}
