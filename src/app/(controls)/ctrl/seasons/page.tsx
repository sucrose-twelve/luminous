import type { Metadata } from "next"

import { readSeasonRows } from "@/app/(controls)/actions/read"
import { ControlPage, TableCard } from "@/app/(controls)/components/control-page"
import { SeasonTable } from "@/app/(controls)/components/season-table"
import { TablePager } from "@/app/(controls)/components/table-pager"

import { ClearSearchButton } from "./components/clear-search-button"
import { SeasonFilters } from "./components/season-filters"
import { queryValidator } from "./validator.nuqs"

/**
 * The page blocks by design (plain SSR that reads the session), so it opts out of instant-navigation
 * validation.
 */
export const instant = false

export const metadata: Metadata = { title: "Seasons" }

/**
 * Every season across the catalogue, adult kinds included, filtered from the side panel. The header's search
 * lands here (`?search=`). New seasons are made from their content's page.
 */
export default async function Seasons({ searchParams }: NextSearchParams) {
  const query = queryValidator.parse(await searchParams)
  const { data, ...page } = await readSeasonRows(
    {
      kinds: query.kind,
      sources: query.source,
      genres: query.genres,
      statuses: query.status,
      audios: query.audio,
      seasonals: query.seasonal,
      search: query.search
    },
    query
  )
  const isFiltered =
    !!query.search ||
    [
      query.kind,
      query.source,
      query.genres,
      query.status,
      query.audio,
      query.seasonal
    ].some((values) => values.length > 0)

  return (
    <ControlPage
      title={query.search ? `Results for “${query.search}”` : "Seasons"}
      description='Every season across the catalogue. New seasons are added from their content.'
      actions={query.search ? <ClearSearchButton /> : null}
      aside={<SeasonFilters />}>
      <TableCard footer={<TablePager page={page} />}>
        <SeasonTable
          rows={data}
          current={{
            sort: query.sort ?? (query.search ? "" : "released"),
            order: query.order
          }}
          showContent
          empty={isFiltered ? "No seasons match." : "No seasons yet."}
        />
      </TableCard>
    </ControlPage>
  )
}
