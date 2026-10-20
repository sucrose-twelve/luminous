import { Link } from "@/components/link"

/**
 * What the page shows without rows: a first visit points to Browse, a filter that matches nothing offers to
 * clear the filters (keeping the view).
 */
export function HistoryEmpty({
  isFiltered,
  clearHref
}: Readonly<{ isFiltered: boolean; clearHref: string }>) {
  return (
    <div className='flex flex-col items-center gap-y-3 py-32 text-center'>
      <p className='text-lg font-bold'>
        {isFiltered ? "No history matches these filters" : "No watch history yet"}
      </p>
      {isFiltered ? null : (
        <p className='text-sm text-zinc-400'>Titles you watch will show up here.</p>
      )}
      <Link
        className='text-theme text-sm font-bold underline-offset-4 hover:underline'
        href={isFiltered ? clearHref : "/browse"}>
        {isFiltered ? "Clear filters" : "Browse contents"}
      </Link>
    </div>
  )
}
