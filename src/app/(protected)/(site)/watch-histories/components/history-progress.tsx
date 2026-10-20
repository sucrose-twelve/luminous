import { ProgressBar } from "@heroui/react"

import type { HistoryItem } from "../utils"

/**
 * How far into the shown episode the account is, in the theme color. Screen readers hear the time
 * (`5 minutes of 24 minutes`) rather than a bare percentage.
 */
export function HistoryProgress({
  item,
  className
}: Readonly<{ item: HistoryItem; className?: string }>) {
  return (
    <ProgressBar
      className={className}
      aria-label='Watch progress'
      size='sm'
      value={item.percent}
      valueLabel={item.spokenTime}>
      <ProgressBar.Track className='bg-foreground/10 rounded-full'>
        <ProgressBar.Fill className='bg-theme rounded-full' />
      </ProgressBar.Track>
    </ProgressBar>
  )
}
