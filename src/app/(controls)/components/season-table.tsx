import Image from "next/image"

import { Link } from "@/components/link"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { KIND_LABELS, SEASON_KIND_LABELS, type Order } from "@/constants"
import { seasonName } from "@/libs/season"

import type { SeasonRow } from "../actions/read"
import { formatDate } from "../utils"
import { TableEmpty } from "./control-page"
import { AudioBadges, SeasonStatusBadge } from "./season-badges"
import { SortHead } from "./sort-head"

/**
 * The seasons table, shared by a content's page and `/ctrl/seasons` (`docs/design/watch-history/00-list-view.png`
 * for the first column). `Episodes` counts imported episodes, so `0` means `tests/track.spec.ts` hasn't run for
 * the season yet.
 *
 * @param showContent - Name each season's content under it, for the list across every content
 * @param empty - What an empty table says
 */
export function SeasonTable({
  rows,
  current,
  showContent,
  empty
}: Readonly<{
  rows: SeasonRow[]
  current: { sort: string; order: Order }
  showContent: boolean
  empty: React.ReactNode
}>) {
  return (
    <Table>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <SortHead column='title' label='Season' current={current} />
          <SortHead column='kind' label='Kind' current={current} />
          <SortHead column='status' label='Status' current={current} />
          <SortHead
            column='released'
            label='Released'
            current={current}
            firstOrder='desc'
          />
          <SortHead
            column='episodes'
            label='Episodes'
            current={current}
            firstOrder='desc'
          />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? <TableEmpty colSpan={5}>{empty}</TableEmpty> : null}

        {rows.map(({ season, content, episodes }) => {
          const name = seasonName(season)
          const subtitle = showContent
            ? `${content.title} · ${KIND_LABELS[content.kind]}`
            : season.title && season.title !== name
              ? season.title
              : null

          return (
            <TableRow key={season.id}>
              <TableCell className='py-2.5'>
                <div className='flex items-center gap-3'>
                  <Image
                    className='aspect-2/3 h-15 w-10 shrink-0 rounded-md bg-zinc-800 object-cover'
                    alt=''
                    src={`/api/art/poster/${season.id}`}
                    width={40}
                    height={60}
                  />
                  <div className='flex min-w-0 flex-col gap-1'>
                    <Link
                      href={`/ctrl/seasons/${season.id}`}
                      className='truncate font-medium hover:underline'>
                      {name}
                    </Link>
                    {subtitle ? (
                      <span className='truncate text-xs text-zinc-400'>{subtitle}</span>
                    ) : null}
                    <AudioBadges audios={season.sources} />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant='secondary'>{SEASON_KIND_LABELS[season.kind]}</Badge>
              </TableCell>
              <TableCell>
                <SeasonStatusBadge status={season.status} />
              </TableCell>
              <TableCell>{formatDate(season.releasedOn)}</TableCell>
              <TableCell>
                {episodes > 0 ? (
                  <span className='tabular-nums'>{episodes}</span>
                ) : (
                  <Badge className='bg-amber-500/15 text-amber-300'>Not imported</Badge>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
