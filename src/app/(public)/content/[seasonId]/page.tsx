import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { cls } from "@/libs/utils"

import { readResumeEpisodeId, readSeasonDetail, readSeasonEpisodes } from "./actions/read"
import { EpisodeGrid } from "./components/episode-grid"
import { SeasonBreadcrumbs } from "./components/season-breadcrumbs"
import { SeasonHero } from "./components/season-hero"
import { SeasonList } from "./components/season-list"
import { seasonTitle } from "./utils"
import { paramValidator } from "./validator.zod"

/**
 * The page blocks by design (plain SSR that reads the session for the in-progress mark), so it opts out of
 * instant-navigation validation.
 */
export const instant = false

export async function generateMetadata({
  params
}: NextParams<{ seasonId: string }>): Promise<Metadata> {
  const parsed = paramValidator.safeParse(await params)
  const detail = parsed.success ? await readSeasonDetail(parsed.data.seasonId) : null
  if (!detail) return {}

  const { season, content } = detail
  return {
    title: seasonTitle(content.title, season),
    description: season.synopsis ?? content.synopsis ?? undefined
  }
}

export default async function ContentSeason({
  params
}: NextParams<{ seasonId: string }>) {
  const parsed = paramValidator.safeParse(await params)
  if (!parsed.success) notFound()

  const { seasonId } = parsed.data
  const [detail, episodes, resumeEpisodeId] = await Promise.all([
    readSeasonDetail(seasonId),
    readSeasonEpisodes(seasonId),
    readResumeEpisodeId(seasonId)
  ])
  if (!detail) notFound()

  const { season, content, otherSeasons } = detail
  const synopsis = season.synopsis ?? content.synopsis

  return (
    <section className='min-h-dvh overflow-x-clip'>
      <div
        className='absolute inset-0 bg-cover opacity-20'
        style={{
          backgroundImage:
            "radial-gradient(closest-side,var(--color-theme-950),transparent)"
        }}
      />

      <div className='bg-background/60 backdrop-blur-xl'>
        <div className='max-w-8xl mx-auto w-full px-4 py-4 sm:py-8'>
          <SeasonBreadcrumbs contentTitle={content.title} />
          <SeasonHero season={season} content={content} />
        </div>
      </div>

      <div
        className={cls(
          "max-w-8xl mx-auto grid w-full gap-12 px-4 py-8",
          otherSeasons.length > 0 && "lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16"
        )}>
        <div className='flex min-w-0 flex-col gap-8'>
          {synopsis ? (
            <section>
              <h2 className='pb-2 text-lg font-bold'>Synopsis</h2>
              <p className='max-w-6xl text-sm leading-relaxed whitespace-pre-line text-zinc-300'>
                {synopsis}
              </p>
            </section>
          ) : null}

          <EpisodeGrid
            title={season.title ?? content.title}
            episodes={episodes}
            isMovie={season.kind === "movie"}
            resumeEpisodeId={resumeEpisodeId}
          />
        </div>

        {otherSeasons.length > 0 ? (
          <SeasonList seasons={otherSeasons} contentTitle={content.title} />
        ) : null}
      </div>
    </section>
  )
}
