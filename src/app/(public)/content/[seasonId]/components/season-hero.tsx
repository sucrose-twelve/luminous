import { Chip } from "@heroui/react"
import Image from "next/image"

import { SOURCE_LABELS, STATUS_LABELS } from "@/constants/labels"
import { airedLabel } from "@/libs/season"

import type { SeasonDetail } from "../actions/read"
import { genreText, KIND_FULL_LABELS, seasonTitle } from "../utils"

/**
 * The top of the page: the season's poster (the page's only preloaded image), genre chips, full title, the
 * Japanese title, and a row of facts.
 */
export function SeasonHero({
  season,
  content
}: Readonly<Pick<SeasonDetail, "season" | "content">>) {
  const title = seasonTitle(content.title, season)
  const facts = [
    { label: "Kind", value: KIND_FULL_LABELS[content.kind] },
    ...(content.source
      ? [{ label: "Source", value: SOURCE_LABELS[content.source] }]
      : []),
    { label: "Aired", value: airedLabel(season.releasedOn) },
    { label: "Status", value: STATUS_LABELS[season.status] }
  ]

  return (
    <header className='flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-9'>
      <div className='relative aspect-5/7 w-40 shrink-0 overflow-hidden rounded-sm bg-zinc-900 sm:w-44 lg:w-50'>
        <Image
          className='bg-zinc-900 object-cover object-center'
          src={`/api/art/poster/${season.id}`}
          alt={title}
          sizes='(max-width: 640px) 128px, (max-width: 1024px) 160px, 200px'
          quality={100}
          preload
          fill
        />
      </div>

      <div className='flex min-w-0 flex-col gap-y-3 pb-1'>
        {content.genres.length ? (
          <div className='flex flex-wrap gap-2'>
            {content.genres.map((genre) => (
              <Chip key={genre} className='bg-theme-500 text-theme-950' size='sm'>
                <Chip.Label>{genreText(genre)}</Chip.Label>
              </Chip>
            ))}
          </div>
        ) : null}

        <h1 className='max-w-5xl text-3xl font-bold sm:text-4xl'>{title}</h1>
        {content.altTitles.JP ? (
          <p className='text-zinc-300' lang='ja'>
            {content.altTitles.JP}
          </p>
        ) : null}

        <dl className='flex flex-wrap gap-x-6 gap-y-1 pt-3 text-xs'>
          {facts.map((fact) => (
            <div key={fact.label} className='flex gap-x-1.5'>
              <dt className='text-zinc-500'>{fact.label}:</dt>
              <dd className='text-zinc-200'>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  )
}
