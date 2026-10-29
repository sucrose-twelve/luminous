import Image from "next/image"

import { TableEmpty } from "@/app/(controls)/components/control-page"
import { AudioBadges } from "@/app/(controls)/components/season-badges"
import { PlainHead, SortHead } from "@/app/(controls)/components/sort-head"
import { formatDate } from "@/app/(controls)/utils"
import { Link } from "@/components/link"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { EPISODE_KIND_LABELS, type Order } from "@/constants"
import type { Locales } from "@/constants/enum"
import { episodeTag, episodeTitle } from "@/libs/episode"
import { formatTime } from "@/libs/time"
import { pad2 } from "@/libs/utils"

import type { ControlEpisodeRow } from "../actions/read"

const SKIP_INITIALS = { intro: "I", outro: "O", recap: "R" } as const

/**
 * A season's episodes. Audio lists the imported tracks; a language the season's sources list without a track
 * for the episode shows faded, so a dub that still needs importing stands out.
 *
 * @param sources - The season's sources, to find the languages an episode is missing
 */
export function EpisodeTable({
  seasonId,
  rows,
  sources,
  current,
  empty
}: Readonly<{
  seasonId: string
  rows: ControlEpisodeRow[]
  sources: readonly Content.SeasonSource[]
  current: { sort: string; order: Order }
  empty: React.ReactNode
}>) {
  return (
    <Table>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <SortHead column='number' label='#' current={current} className='w-14' />
          <PlainHead label='Title' />
          <SortHead column='kind' label='Kind' current={current} />
          <PlainHead label='Audio' />
          <SortHead
            column='duration'
            label='Duration'
            current={current}
            firstOrder='desc'
          />
          <PlainHead label='Skips' />
          <SortHead column='aired' label='Aired' current={current} firstOrder='desc' />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? <TableEmpty colSpan={7}>{empty}</TableEmpty> : null}

        {rows.map((episode) => {
          const imported = new Set<Locales>(episode.languages)
          const audios = sources.map(({ language, isDubbed }) => ({ language, isDubbed }))

          return (
            <TableRow key={episode.id}>
              <TableCell className='font-mono tabular-nums'>
                {pad2(episode.episodeNo)}
              </TableCell>
              <TableCell className='max-w-96 py-2.5'>
                <div className='flex items-center gap-3'>
                  {episode.hasThumbnail ? (
                    <Image
                      className='aspect-video h-9 w-16 shrink-0 rounded-md bg-zinc-800 object-cover'
                      alt=''
                      src={`/api/art/thumbnail/${episode.id}`}
                      width={64}
                      height={36}
                    />
                  ) : (
                    <span className='aspect-video h-9 w-16 shrink-0 rounded-md bg-zinc-800' />
                  )}
                  <Link
                    href={`/ctrl/seasons/${seasonId}/episodes/${episode.id}`}
                    className='truncate font-medium hover:underline'>
                    {episodeTitle(episode) ?? episodeTag(episode, " ")}
                  </Link>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant='secondary'>{EPISODE_KIND_LABELS[episode.kind]}</Badge>
              </TableCell>
              <TableCell>
                <AudioBadges
                  audios={audios}
                  missing={audios
                    .map(({ language }) => language)
                    .filter((language) => !imported.has(language))}
                />
              </TableCell>
              <TableCell className='tabular-nums'>
                {episode.duration === null
                  ? "—"
                  : formatTime(episode.duration, episode.duration)}
              </TableCell>
              <TableCell>
                {episode.skips.length ? (
                  <span
                    className='font-mono text-xs text-zinc-300'
                    title={episode.skips.map((skip) => skip.kind).join(", ")}>
                    {episode.skips.map((skip) => SKIP_INITIALS[skip.kind]).join(" ")}
                  </span>
                ) : (
                  <span className='text-zinc-500'>—</span>
                )}
              </TableCell>
              <TableCell>{episode.airedOn ? formatDate(episode.airedOn) : "—"}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
