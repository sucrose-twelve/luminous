import type { Metadata } from "next"

import { readWatchHistories } from "./actions/read"
import { HistoryEmpty } from "./components/history-empty"
import { HistoryGridCard } from "./components/history-grid-card"
import { HistoryListItem } from "./components/history-list-item"
import { HistoryPagination } from "./components/history-pagination"
import { HistoryToolbar } from "./components/history-toolbar"
import { toHistoryItem } from "./utils"
import { queryValidator } from "./validator.nuqs"

/**
 * The page blocks by design (plain SSR that reads the session), so it opts out of instant-navigation
 * validation.
 */
export const instant = false

export const metadata: Metadata = { title: "Watch History" }

export default async function WatchHistories({ searchParams }: NextSearchParams) {
  const query = queryValidator.parse(await searchParams)
  const result = await readWatchHistories(query)
  const page = result.ok ? result.data : null

  /**
   * Read after the session (`withAuth` reads the cookie), so the clock is a request-time value.
   */
  const now = new Date()
  const items = page?.data.map((row) => toHistoryItem(row, now)) ?? []
  const isFiltered = query.kind !== null || query.status !== null

  return (
    <section className='max-w-8xl mx-auto w-full px-4 py-8'>
      <h1 className='sr-only'>Watch History</h1>

      {items.length || isFiltered ? <HistoryToolbar /> : null}

      {page && items.length ? (
        <>
          {query.view === "list" ? (
            <div className='flex flex-col gap-3 pt-6'>
              {items.map((item) => (
                <HistoryListItem key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {items.map((item) => (
                <HistoryGridCard key={item.id} item={item} />
              ))}
            </div>
          )}

          <div className='pt-8 sm:pt-16'>
            <HistoryPagination
              currentPage={page.currentPage}
              lastPage={page.lastPage}
              prevPage={page.prevPage}
              nextPage={page.nextPage}
            />
          </div>
        </>
      ) : (
        <HistoryEmpty
          isFiltered={isFiltered}
          clearHref={
            query.view === "list" ? "/watch-histories?view=list" : "/watch-histories"
          }
        />
      )}
    </section>
  )
}
