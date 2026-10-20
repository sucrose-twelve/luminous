import { KindTabs } from "./kind-tabs"
import { SortSelect } from "./sort-select"
import { StatusTabs } from "./status-tabs"
import { ViewToggle } from "./view-toggle"

/**
 * The card above the list: kind tabs on the left; status, sort, and view on the right. One row from `lg`,
 * two rows below it.
 */
export function HistoryToolbar() {
  return (
    <div className='border-foreground/10 bg-foreground/2 flex flex-col gap-3 rounded-2xl border p-3 lg:flex-row lg:items-center lg:justify-between'>
      <KindTabs />

      <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
        <StatusTabs />
        <div className='flex grow items-center gap-2 sm:grow-0 sm:gap-3'>
          <SortSelect />
          <ViewToggle />
        </div>
      </div>
    </div>
  )
}
