import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { readSeasonRows } from "@/app/(controls)/actions/read"
import { ContentActions } from "@/app/(controls)/components/content-actions"
import {
  ControlPage,
  PanelBody,
  TableCard
} from "@/app/(controls)/components/control-page"
import { ToggleFilter } from "@/app/(controls)/components/filter-bar"
import { SeasonTable } from "@/app/(controls)/components/season-table"
import { TablePager } from "@/app/(controls)/components/table-pager"
import {
  SEASON_KIND_LABELS,
  SEASON_KINDS,
  SEASON_STATUSES,
  STATUS_LABELS
} from "@/constants"

import { readControlContent } from "./actions/read"
import { ContentDetails } from "./components/content-details"
import { queryValidator } from "./validator.nuqs"

/**
 * The page blocks by design (plain SSR that reads the session), so it opts out of instant-navigation
 * validation.
 */
export const instant = false

const KIND_ITEMS = SEASON_KINDS.map((kind) => ({
  value: kind,
  label: SEASON_KIND_LABELS[kind]
}))

const STATUS_ITEMS = SEASON_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status]
}))

/**
 * Same read as the page; the reader isn't cached, but one extra primary-key lookup is cheap.
 */
export async function generateMetadata({
  params
}: NextParams<{ contentId: string }>): Promise<Metadata> {
  const { contentId } = await params
  if (!z.uuid().safeParse(contentId).success) return {}

  const content = await readControlContent(contentId)
  return content ? { title: content.title } : {}
}

/**
 * A content: its details in the side panel and its seasons in the table, filtered by season kind and status.
 */
export default async function ControlContent({
  params,
  searchParams
}: NextParams<{ contentId: string }> & NextSearchParams) {
  const { contentId } = await params
  if (!z.uuid().safeParse(contentId).success) notFound()

  const query = queryValidator.parse(await searchParams)
  const [content, { data, ...page }] = await Promise.all([
    readControlContent(contentId),
    readSeasonRows(
      {
        contentId,
        seasonKinds: query.kind ? [query.kind] : [],
        statuses: query.status ? [query.status] : []
      },
      query
    )
  ])
  if (!content) notFound()

  const isFiltered = query.kind !== null || query.status !== null

  return (
    <ControlPage
      title={content.title}
      description={
        Object.values(content.altTitles).filter(Boolean).join(" · ") || content.slug
      }
      breadcrumbs={[
        { label: "Contents", href: "/ctrl/contents" },
        { label: content.title }
      ]}
      actions={<ContentActions variant='buttons' content={content} />}
      aside={
        <PanelBody>
          <ContentDetails content={content} />
        </PanelBody>
      }>
      <TableCard
        toolbar={
          <>
            <ToggleFilter
              label='Kind'
              param='kind'
              items={KIND_ITEMS}
              value={query.kind}
            />
            <ToggleFilter
              label='Status'
              param='status'
              items={STATUS_ITEMS}
              value={query.status}
            />
          </>
        }
        footer={<TablePager page={page} />}>
        <SeasonTable
          rows={data}
          current={{ sort: query.sort, order: query.order }}
          showContent={false}
          empty={isFiltered ? "No seasons match these filters." : "No seasons yet."}
        />
      </TableCard>
    </ControlPage>
  )
}
