import type { Metadata } from "next"

import { Link } from "@/components/link"

import { readBrowse } from "./actions/read"
import { readBrowseFilters } from "./actions/read-filters"
import { BrowsePagination } from "./components/browse-pagination"
import { ContentCard } from "./components/content-card"
import { FilterDrawer } from "./components/filter-drawer"
import { KindSelect } from "./components/kind-select"
import { SortSelect } from "./components/sort-select"
import { queryValidator } from "./validator.nuqs"

export const instant = false

export const metadata: Metadata = { title: "Browse" }

export default async function Browse({ searchParams }: NextSearchParams) {
  const query = queryValidator.parse(await searchParams)
  const [filters, result] = await Promise.all([readBrowseFilters(), readBrowse(query)])
  const page = result.ok ? result.data : null

  return (
    <section className='max-w-8xl mx-auto w-full px-4 py-8'>
      <header className='flex flex-wrap items-end justify-between gap-4 pb-8 sm:gap-6 sm:pb-12'>
        <div className='max-w-xl'>
          <h1 className='text-2xl font-bold sm:text-4xl'>Contents</h1>
          <p className='mt-2 text-xs text-zinc-500'>
            Every anime, movie, and series on the home server. Pick a kind, sort, or open
            the filter to narrow it down.
          </p>
        </div>

        <div className='flex w-full items-center gap-x-2 sm:w-auto sm:gap-x-4'>
          <KindSelect kinds={filters.kinds} />
          <SortSelect />
          <FilterDrawer filters={filters} />
        </div>
      </header>

      {page?.data.length ? (
        <>
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-6'>
            {page.data.map((item, index) => (
              <ContentCard key={item.season.id} index={index} item={item} />
            ))}
          </div>

          <div className='pt-8 sm:pt-16'>
            <BrowsePagination
              currentPage={page.currentPage}
              lastPage={page.lastPage}
              prevPage={page.prevPage}
              nextPage={page.nextPage}
            />
          </div>
        </>
      ) : (
        <div className='flex flex-col items-center gap-y-3 py-32 text-center'>
          <p className='text-lg font-bold'>No contents match these filters</p>
          <Link
            className='text-primary text-sm font-bold underline-offset-4 hover:underline'
            href='/browse'>
            Clear all filters
          </Link>
        </div>
      )}
    </section>
  )
}
