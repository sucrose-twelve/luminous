import Image from "next/image"

import { ContentActions } from "@/app/(controls)/components/content-actions"
import { TableEmpty } from "@/app/(controls)/components/control-page"
import { PlainHead, SortHead } from "@/app/(controls)/components/sort-head"
import { formatDate, formatDateTime } from "@/app/(controls)/utils"
import { Link } from "@/components/link"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { KIND_LABELS, SOURCE_LABELS, type Order } from "@/constants"
import { GENRE_LABELS } from "@/constants/data/genres"

import type { ControlContentRow } from "../actions/read"

/**
 * How many genre chips a row shows before folding the rest into `+N`.
 */
const VISIBLE_GENRES = 3

/**
 * The contents table, each title with the poster of its latest season. `canDelete` (root) adds Delete to the
 * row menu. The title opens the content's page; `⋯` edits it, adds a season, or copies its ID.
 */
export function ContentTable({
  rows,
  current,
  empty,
  canDelete
}: Readonly<{
  rows: ControlContentRow[]
  current: { sort: string; order: Order }
  empty: React.ReactNode
  canDelete: boolean
}>) {
  return (
    <Table>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <SortHead column='title' label='Title' current={current} />
          <SortHead column='kind' label='Kind' current={current} />
          <SortHead column='source' label='Source' current={current} />
          <PlainHead label='Genres' />
          <SortHead
            column='seasons'
            label='Seasons'
            current={current}
            firstOrder='desc'
          />
          <SortHead
            column='updated'
            label='Updated'
            current={current}
            firstOrder='desc'
          />
          <PlainHead className='w-12' />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? <TableEmpty colSpan={7}>{empty}</TableEmpty> : null}

        {rows.map((row) => {
          const hidden = row.genres.slice(VISIBLE_GENRES)

          return (
            <TableRow key={row.id}>
              <TableCell className='max-w-96 py-2.5'>
                <div className='flex items-center gap-3'>
                  {row.posterSeasonId ? (
                    <Image
                      className='aspect-2/3 h-15 w-10 shrink-0 rounded-md bg-zinc-800 object-cover'
                      alt=''
                      src={`/api/art/poster/${row.posterSeasonId}`}
                      width={40}
                      height={60}
                    />
                  ) : (
                    <span className='aspect-2/3 h-15 w-10 shrink-0 rounded-md bg-zinc-800' />
                  )}
                  <div className='flex min-w-0 flex-col'>
                    <Link
                      href={`/ctrl/contents/${row.id}`}
                      className='truncate font-medium hover:underline'>
                      {row.title}
                    </Link>
                    <span className='truncate font-mono text-xs text-zinc-500'>
                      {row.slug}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant='secondary'>{KIND_LABELS[row.kind]}</Badge>
              </TableCell>
              <TableCell className='text-zinc-300'>
                {row.source ? SOURCE_LABELS[row.source] : "—"}
              </TableCell>
              <TableCell>
                <div className='flex max-w-72 flex-wrap gap-1'>
                  {row.genres.slice(0, VISIBLE_GENRES).map((slug) => (
                    <Badge key={slug} variant='outline'>
                      {GENRE_LABELS[slug] ?? slug}
                    </Badge>
                  ))}
                  {hidden.length ? (
                    <Tooltip>
                      <TooltipTrigger
                        delay={0}
                        render={<Badge tabIndex={0} variant='outline' />}>
                        +{hidden.length}
                      </TooltipTrigger>
                      <TooltipContent>
                        {hidden.map((slug) => GENRE_LABELS[slug] ?? slug).join(", ")}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {row.genres.length === 0 ? (
                    <span className='text-zinc-500'>—</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className='tabular-nums'>{row.seasons}</TableCell>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger
                    delay={200}
                    render={<span tabIndex={0} className='cursor-default' />}>
                    {formatDate(row.updatedAt)}
                  </TooltipTrigger>
                  <TooltipContent>{formatDateTime(row.updatedAt)}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                <ContentActions
                  variant='menu'
                  canDelete={canDelete}
                  content={{
                    id: row.id,
                    slug: row.slug,
                    title: row.title,
                    kind: row.kind,
                    source: row.source,
                    altTitles: row.altTitles,
                    synopsis: row.synopsis,
                    genres: row.genres,
                    sourceDir: row.sourceDir
                  }}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
