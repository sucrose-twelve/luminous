"use client"

import { buttonVariants } from "@heroui/react"
import { PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Link } from "@/components/link"
import { cls } from "@/libs/utils"

/**
 * The card's Watch button: a link to the season's content page, styled as a button. Not prefetched, so a
 * full grid of cards doesn't make the server render every content page.
 */
export function WatchLink({ seasonId }: Readonly<{ seasonId: string }>) {
  return (
    <Link
      className={cls(
        buttonVariants({ variant: "primary", fullWidth: true }),
        "text-background h-8 rounded-sm bg-white px-4"
      )}
      href={`/content/${seasonId}`}
      prefetch={false}>
      <HugeiconsIcon icon={PlayIcon} color='currentColor' size={20} strokeWidth={2} />
      <span className='text-sm font-bold uppercase'>watch</span>
    </Link>
  )
}
