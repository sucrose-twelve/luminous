import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Link } from "@/components/link"

import type { HistoryItem } from "../utils"
import { ContinueLink } from "./continue-link"
import { HistoryProgress } from "./history-progress"
import { HistoryThumbnail } from "./history-thumbnail"
import { RemoveButton } from "./remove-button"

/**
 * One title in the list view: picture, titles, the shown episode with its time and progress, and the actions
 * on the right. On mobile the actions get a full-width row of their own, like the grid card's footer, rather
 * than the narrow picture column. A completed title has no Continue button, only Remove.
 */
export function HistoryListItem({ item }: Readonly<{ item: HistoryItem }>) {
  return (
    <article className='border-foreground/10 bg-foreground/2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4'>
      <HistoryThumbnail
        className='aspect-7/5 w-24 self-start rounded-lg sm:w-28 sm:self-center'
        item={item}
        sizes='112px'
      />

      <div className='flex min-w-0 flex-col gap-1'>
        <Link
          className='line-clamp-1 font-bold underline-offset-4 hover:underline'
          href={`/content/${item.seasonId}`}
          prefetch={false}>
          {item.title}
        </Link>
        {item.altTitle ? (
          <p className='line-clamp-1 text-sm text-zinc-400'>{item.altTitle}</p>
        ) : null}

        <p className='flex flex-wrap items-center gap-x-2 text-xs text-zinc-300'>
          <span className='line-clamp-1'>
            <span className='text-primary font-bold'>{item.episodeLabel}</span>
            {item.episodeTitle ? <> - &quot;{item.episodeTitle}&quot;</> : null}
          </span>
          <span aria-hidden className='text-zinc-500'>
            •
          </span>
          <span className='flex items-center gap-1 font-mono text-zinc-400'>
            <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={1.8} />
            {item.time}
          </span>
        </p>

        <div className='flex items-center gap-2'>
          <HistoryProgress className='grow' item={item} />
          <span
            aria-hidden
            className='w-9 shrink-0 text-right font-mono text-xs text-zinc-400'>
            {item.percent}%
          </span>
        </div>
      </div>

      <div className='max-sm:border-foreground/10 flex items-stretch justify-end gap-2 max-sm:col-span-full max-sm:border-t max-sm:pt-3 sm:self-end sm:pl-4'>
        {item.continueHref ? (
          <ContinueLink className='max-sm:grow' href={item.continueHref} />
        ) : null}
        <RemoveButton
          className='max-sm:order-last'
          id={item.id}
          title={item.title}
          isIconOnly
        />
      </div>
    </article>
  )
}
