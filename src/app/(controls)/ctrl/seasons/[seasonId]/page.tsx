import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import {
  ControlPage,
  PanelBody,
  TableCard
} from "@/app/(controls)/components/control-page"
import { ToggleFilter } from "@/app/(controls)/components/filter-bar"
import { TablePager } from "@/app/(controls)/components/table-pager"
import {
  AUDIO_LABELS,
  AUDIO_LANGUAGES,
  AUDIOS,
  EPISODE_KIND_LABELS,
  EPISODE_KINDS
} from "@/constants"
import { seasonName } from "@/libs/season"

import { readControlSeason, readSeasonEpisodes } from "./actions/read"
import { EpisodeTable } from "./components/episode-table"
import { SeasonActions } from "./components/season-actions"
import { SeasonDetails } from "./components/season-details"
import { queryValidator } from "./validator.nuqs"

/**
 * The page blocks by design (plain SSR that reads the session), so it opts out of instant-navigation
 * validation.
 */
export const instant = false

const KIND_ITEMS = EPISODE_KINDS.map((kind) => ({
  value: kind,
  label: EPISODE_KIND_LABELS[kind]
}))

export async function generateMetadata({
  params
}: NextParams<{ seasonId: string }>): Promise<Metadata> {
  const { seasonId } = await params
  if (!z.uuid().safeParse(seasonId).success) return {}

  const detail = await readControlSeason(seasonId)
  return detail ? { title: `${detail.content.title} – ${seasonName(detail.season)}` } : {}
}

/**
 * A season: its details and sources in the side panel, its episodes in the table, and the import command that
 * fills that table.
 */
export default async function ControlSeason({
  params,
  searchParams
}: NextParams<{ seasonId: string }> & NextSearchParams) {
  const { seasonId } = await params
  if (!z.uuid().safeParse(seasonId).success) notFound()

  const query = queryValidator.parse(await searchParams)
  const [detail, { data, ...page }] = await Promise.all([
    readControlSeason(seasonId),
    readSeasonEpisodes(seasonId, query)
  ])
  if (!detail) notFound()

  const { season, content } = detail
  const name = seasonName(season)
  /**
   * Only the season's own languages are offered, in the URL's short codes.
   */
  const audioItems = AUDIOS.filter((audio) =>
    season.sources.some((source) => source.language === AUDIO_LANGUAGES[audio])
  ).map((audio) => ({ value: audio, label: AUDIO_LABELS[audio] }))
  const isFiltered = query.kind !== null || query.audio !== null

  return (
    <ControlPage
      title={name}
      description={
        season.title && season.title !== name
          ? `${content.title} · ${season.title}`
          : content.title
      }
      breadcrumbs={[
        { label: "Contents", href: "/ctrl/contents" },
        { label: content.title, href: `/ctrl/contents/${content.id}` },
        { label: name }
      ]}
      actions={
        <SeasonActions
          content={{ id: content.id, title: content.title, sourceDir: content.sourceDir }}
          season={{
            id: season.id,
            kind: season.kind,
            seasonNo: season.seasonNo,
            title: season.title,
            synopsis: season.synopsis,
            status: season.status,
            sources: season.sources,
            poster: season.poster,
            releasedOn: season.releasedOn
          }}
        />
      }
      aside={
        <PanelBody>
          <SeasonDetails season={detail} />
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
            {audioItems.length > 1 ? (
              <ToggleFilter
                label='Audio'
                param='audio'
                items={audioItems}
                value={query.audio}
              />
            ) : null}
          </>
        }
        footer={<TablePager page={page} />}>
        <EpisodeTable
          seasonId={season.id}
          rows={data}
          sources={season.sources}
          current={{ sort: query.sort, order: query.order }}
          empty={
            isFiltered
              ? "No episodes match these filters."
              : "No episodes yet. Run the import command, then refresh the site cache."
          }
        />
      </TableCard>
    </ControlPage>
  )
}
