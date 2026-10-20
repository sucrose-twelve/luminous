"use client"

import { Chip } from "@heroui/react"
import { motion } from "framer-motion"
import Image from "next/image"

import { KIND_LABELS } from "@/constants/labels"
import { seasonName } from "@/libs/season"

import type { BrowseItem } from "../actions/read"
import { WatchLink } from "./watch-link"

/**
 * One season in the browse grid: poster, kind and dub chips, content title, and season name. The Watch link
 * slides in on hover or keyboard focus (`.card-content` in `styles/components/card-content.css`).
 */
export function ContentCard({
  index,
  item
}: Readonly<{ index: number; item: BrowseItem }>) {
  const { season, content, audios } = item
  const isDubbed = audios.some((audio) => audio.isDubbed)

  return (
    <motion.article
      className='card-content'
      key={season.id}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.025 }}>
      <div className='card-content-shadow' />
      <div className='card-content-poster relative'>
        <Image
          className='bg-zinc-900 object-cover object-center'
          src={`/api/art/poster/${season.id}`}
          alt={content.title}
          sizes='(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw'
          quality={100}
          fill
          loading='eager'
        />
      </div>

      <div className='card-content-desc'>
        <div className='flex justify-center gap-x-1 pb-1'>
          <Chip className='bg-theme-500 text-theme-50' size='sm'>
            <Chip.Label>{KIND_LABELS[content.kind]}</Chip.Label>
          </Chip>

          {isDubbed ? (
            <Chip className='text-theme-50 bg-blue-500' size='sm'>
              <Chip.Label>Dubbed</Chip.Label>
            </Chip>
          ) : null}
        </div>

        <h2
          className='text-md line-clamp-1 font-bold sm:text-lg'
          title={content.title + (season?.title ? ` - ${season.title}` : "")}>
          {season.title ?? content.title}
        </h2>
        <p className='line-clamp-1 text-xs text-zinc-300'>{seasonName(season)}</p>

        <div className='buttons'>
          <WatchLink seasonId={season.id} />
        </div>
      </div>
    </motion.article>
  )
}
