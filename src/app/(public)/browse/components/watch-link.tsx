"use client"

import { PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Link } from "@/components/link"
import { buttonVariants } from "@/components/ui/button"
import { cls } from "@/libs/utils"

/**
 * The card's Watch button: a link to the season's content page, styled as a button. Not prefetched, so a
 * full grid of cards doesn't make the server render every content page.
 */
export function WatchLink({ seasonId }: Readonly<{ seasonId: string }>) {
  return (
    <Link
      className={cls(buttonVariants(), "h-8 w-full rounded-sm px-4")}
      href={`/content/${seasonId}`}
      prefetch={false}>
      <HugeiconsIcon className='size-5' icon={PlayIcon} strokeWidth={2} />
      <span className='text-sm font-bold uppercase'>watch</span>
    </Link>
  )
}
