import { Chip } from "@heroui/react"
import Image from "next/image"

import { Link } from "@/components/link"
import { SeasonStatus } from "@/components/season/status"
import { SEASON_KIND_LABELS } from "@/constants"
import { airedLabel } from "@/libs/season"

import type { SeasonDetail } from "../actions/read"
import { SEASON_KIND_CHIP_CLASSES, seasonTitle } from "../utils"

/**
 * One sibling season in the sidebar: poster, kind and aired chips, and its full title. Links to that
 * season's content page.
 */
export function SeasonCard({
  season,
  contentTitle
}: Readonly<{ season: SeasonDetail["otherSeasons"][number]; contentTitle: string }>) {
  const title = seasonTitle(contentTitle, season)

  return (
    <Link
      className='flex items-end gap-x-3 rounded-md border border-white/5 bg-white/2 p-2 transition-colors hover:bg-white/5'
      href={`/content/${season.id}`}>
      <div className='relative aspect-5/6 w-24 shrink-0 overflow-hidden rounded-sm bg-zinc-800'>
        <Image
          className='bg-zinc-900 object-cover object-center'
          src={`/api/art/poster/${season.id}`}
          alt={title}
          sizes='72px'
          quality={75}
          fill
          loading='eager'
        />
      </div>

      <div className='flex min-w-0 flex-col gap-y-1.5'>
        <SeasonStatus value={season.status} />

        <div className='flex flex-wrap gap-1'>
          <Chip className={SEASON_KIND_CHIP_CLASSES[season.kind]} size='sm'>
            <Chip.Label>{SEASON_KIND_LABELS[season.kind]}</Chip.Label>
          </Chip>
          <Chip className='bg-zinc-800 text-zinc-300' size='sm'>
            <Chip.Label>{airedLabel(season.releasedOn)}</Chip.Label>
          </Chip>
        </div>

        <div className='line-clamp-2 text-sm font-medium'>{title}</div>
      </div>
    </Link>
  )
}
