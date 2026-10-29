import type { Metadata } from "next"

import { NewContentButton } from "@/app/(controls)/components/content-actions"
import { ControlPage, TableCard } from "@/app/(controls)/components/control-page"
import { TablePager } from "@/app/(controls)/components/table-pager"

import { readControlContents } from "./actions/read"
import { ContentFilters } from "./components/content-filters"
import { ContentTable } from "./components/content-table"
import { queryValidator } from "./validator.nuqs"

/**
 * The page blocks by design (plain SSR that reads the session), so it opts out of instant-navigation
 * validation.
 */
export const instant = false

export const metadata: Metadata = { title: "Contents" }

/**
 * Every content in the catalogue, filtered from the side panel. A content's page manages its seasons.
 */
export default async function Contents({ searchParams }: NextSearchParams) {
  const query = queryValidator.parse(await searchParams)
  const { data, ...page } = await readControlContents(query)
  const isFiltered =
    query.kind.length > 0 || query.source.length > 0 || query.genres.length > 0

  return (
    <ControlPage
      title='Contents'
      description='Every title in the catalogue. Open one to manage its seasons.'
      actions={<NewContentButton />}
      aside={<ContentFilters />}>
      <TableCard footer={<TablePager page={page} />}>
        <ContentTable
          rows={data}
          current={{ sort: query.sort, order: query.order }}
          empty={isFiltered ? "No contents match these filters." : "No contents yet."}
        />
      </TableCard>
    </ControlPage>
  )
}
