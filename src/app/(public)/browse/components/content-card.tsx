"use client"

import { Chip } from "@heroui/react"
import { motion } from "framer-motion"
import Image from "next/image"

import { SeasonStatus } from "@/components/season/status"
import { seasonName } from "@/libs/season"
import { cls } from "@/libs/utils"

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

      <div className='pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center gap-1 p-2'>
        <SeasonStatus value={season.status} />

        <Chip className='bg-foreground text-background' size='sm'>
          <Chip.Label className='uppercase'>
            {audios.map((audio) => audio.language.split("-")[1]).join(" • ")}
          </Chip.Label>
        </Chip>
      </div>

      <div className='card-content-desc'>
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
