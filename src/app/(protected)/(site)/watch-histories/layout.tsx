import { readHasWatchHistory } from "./actions/read"
import { HistoryToolbar } from "./components/history-toolbar"

/**
 * Holds the toolbar so it stays mounted while the filters change: only the page re-renders when the search
 * params change, not its layout, so the controls keep their state and their animations run through. The
 * toolbar is left out while the account has no history at all; `refresh()` after a removal re-renders the
 * layout too.
 */
export const instant = false

export default async function WatchHistoriesLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const hasHistory = await readHasWatchHistory()

  return (
    <section className='max-w-8xl mx-auto w-full px-4 py-8'>
      <h1 className='sr-only'>Watch History</h1>

      {hasHistory ? <HistoryToolbar /> : null}

      {children}
    </section>
  )
}
