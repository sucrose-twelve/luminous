import { Link } from "@/components/link"
import { Badge } from "@/components/ui/badge"
import { HISTORY_STATUS_CHIPS } from "@/constants"
import { cls } from "@/libs/utils"

import type { HistoryItem } from "../utils"
import { ContinueLink } from "./continue-link"
import { HistoryProgress } from "./history-progress"
import { HistoryThumbnail } from "./history-thumbnail"
import { RemoveButton } from "./remove-button"

/**
 * One title in the grid view: picture with status and last-watched time, titles, the shown episode with its
 * progress, and the actions. A completed title has no Continue button, only Remove.
 */
export function HistoryGridCard({ item }: Readonly<{ item: HistoryItem }>) {
  return (
    <article className='border-foreground/10 bg-foreground/2 flex flex-col overflow-hidden rounded-2xl border'>
      <HistoryThumbnail
        className='aspect-video'
        item={item}
        sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw'>
        <div className='from-background absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 bg-linear-to-t to-transparent px-3 pt-10 pb-2'>
          <Badge>{HISTORY_STATUS_CHIPS[item.status]}</Badge>
          <p className='font-mono text-xs text-zinc-300'>
            Last watched: {item.watchedAgo}
          </p>
        </div>
      </HistoryThumbnail>

      <div className='flex grow flex-col gap-3 p-4'>
        <div className='min-w-0'>
          <Link
            className='line-clamp-1 font-bold underline-offset-4 hover:underline'
            href={`/content/${item.seasonId}`}
            prefetch={false}>
            {item.title}
          </Link>
          {item.altTitle ? (
            <p className='line-clamp-1 text-sm text-zinc-400'>{item.altTitle}</p>
          ) : null}
        </div>

        <div className='border-foreground/10 bg-foreground/2 flex flex-col gap-2 rounded-xl border p-3'>
          <div className='flex items-baseline justify-between gap-2 text-xs'>
            <span
              className='text-primary line-clamp-1 font-bold'
              title={item.episodeLabel}>
              {item.episodeLabel}
            </span>
            <span className='shrink-0 font-mono text-zinc-400'>{item.time}</span>
          </div>
          {item.episodeTitle ? (
            <p className='line-clamp-1 text-xs text-zinc-400' title={item.episodeTitle}>
              Episode: &quot;{item.episodeTitle}&quot;
            </p>
          ) : null}
          <HistoryProgress className='pt-1' item={item} />
        </div>
      </div>

      <div
        className={cls(
          "border-foreground/10 mx-4 flex gap-2 border-t py-3",
          !item.continueHref && "justify-end"
        )}>
        {item.continueHref ? (
          <ContinueLink className='grow' href={item.continueHref} />
        ) : null}
        <RemoveButton id={item.id} title={item.title} isIconOnly />
      </div>
    </article>
  )
}
