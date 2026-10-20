import { Chip } from "@heroui/react"
import Image from "next/image"

import { Link } from "@/components/link"
import { cls } from "@/libs/utils"

import type { HistoryItem } from "../utils"

/**
 * The card's picture: the shown episode's thumbnail (or the season poster when it has none) with the kind chip,
 * linking to the season page. `children` is laid over its bottom edge (the grid card's status and time).
 */
export function HistoryThumbnail({
  item,
  sizes,
  className,
  children
}: Readonly<{
  item: HistoryItem
  sizes: string
  className?: string
  children?: React.ReactNode
}>) {
  return (
    <Link
      className={cls("relative block shrink-0 overflow-hidden bg-zinc-900", className)}
      href={`/content/${item.seasonId}`}
      prefetch={false}>
      <Image
        className='object-cover object-center'
        src={item.image}
        alt={item.title}
        sizes={sizes}
        quality={75}
        fill
      />
      <Chip className='absolute top-2 left-2' variant='primary' size='sm'>
        {item.kindLabel}
      </Chip>
      {children}
    </Link>
  )
}
