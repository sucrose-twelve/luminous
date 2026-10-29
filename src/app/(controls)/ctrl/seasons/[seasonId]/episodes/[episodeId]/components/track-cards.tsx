import { AudioLinesSparkles } from "@keyline-icons/react/two-tone"

import { CopyButton } from "@/app/(controls)/components/copy-button"
import { DetailList, DetailRow } from "@/app/(controls)/components/detail-list"
import { ImportCommandButton } from "@/app/(controls)/components/import-command"
import { Badge } from "@/components/ui/badge"
import type { Locales } from "@/constants/enum"
import { languageName } from "@/libs/language"
import { formatTime } from "@/libs/time"
import { cls } from "@/libs/utils"

import type { ControlEpisode } from "../actions/read"
import { formatBytes } from "../utils"

type Track = ControlEpisode["tracks"][number]

/**
 * An episode's tracks as cards, original first: an episode has at most one track per language, so the few
 * there are get room for every detail. A language the season's sources list without a track here gets a dashed
 * `Not imported` card that opens the season's import command.
 */
export function TrackCards({
  seasonId,
  tracks,
  sources
}: Readonly<{
  seasonId: string
  tracks: ControlEpisode["tracks"]
  sources: readonly Content.SeasonSource[]
}>) {
  const missing = sources.filter(
    (source) => !tracks.some((track) => track.language === source.language)
  )

  if (tracks.length === 0 && missing.length === 0) {
    return <p className='py-16 text-center text-sm text-zinc-400'>No tracks.</p>
  }

  return (
    <div className='grid grid-cols-3 gap-4 p-3'>
      {tracks.map((track) => (
        <TrackCard key={track.id} track={track} />
      ))}
      {missing.map((source) => (
        <MissingTrackCard key={source.language} seasonId={seasonId} source={source} />
      ))}
    </div>
  )
}

/**
 * How many of the episode's audio versions are imported, for the bar above the cards.
 */
export function trackSummary(
  tracks: ControlEpisode["tracks"],
  sources: readonly Content.SeasonSource[]
) {
  const languages = new Set([
    ...tracks.map((track) => track.language),
    ...sources.map((source) => source.language)
  ])
  return `${tracks.length} of ${languages.size} audio versions imported`
}

function TrackCard({ track }: Readonly<{ track: Track }>) {
  return (
    <article className='flex flex-col overflow-hidden rounded-xl border border-white/6 bg-zinc-900'>
      <TrackPoster language={track.language} isDubbed={track.isDubbed} />

      <div className='px-4 pt-2 pb-4'>
        <DetailList>
          <DetailRow label='Resolution'>
            <span className='tabular-nums'>
              {track.width && track.height ? `${track.width}×${track.height}` : "—"}
            </span>
          </DetailRow>
          <DetailRow label='Duration'>
            <span className='tabular-nums'>
              {formatTime(track.duration, track.duration)}
            </span>
          </DetailRow>
          <DetailRow label='Size'>
            <span className='tabular-nums'>{formatBytes(track.size)}</span>
          </DetailRow>
          <DetailRow label='Fragments'>
            <span className='tabular-nums'>{track.fragments}</span>
          </DetailRow>
          <DetailRow label='Codec' stacked>
            <code className='font-mono text-xs break-all text-zinc-300'>
              {track.mimeCodec}
            </code>
          </DetailRow>
          <DetailRow label='File' stacked>
            <code className='font-mono text-xs break-all text-zinc-300'>
              {track.path}
            </code>
          </DetailRow>
        </DetailList>
      </div>

      <div className='mt-auto flex gap-2 border-t border-white/5 px-4 py-3'>
        <CopyButton variant='text' value={track.path} label='Path' />
        <CopyButton variant='text' value={track.id} label='ID' />
      </div>
    </article>
  )
}

function MissingTrackCard({
  seasonId,
  source
}: Readonly<{ seasonId: string; source: Content.SeasonSource }>) {
  return (
    <article className='flex flex-col overflow-hidden rounded-xl border border-dashed border-white/15'>
      <TrackPoster language={source.language} isDubbed={source.isDubbed} isMissing />

      <div className='flex flex-col gap-3 px-4 pt-2 pb-4 text-sm'>
        <p className='text-zinc-400'>
          Listed in the season&apos;s sources, but this episode has no{" "}
          {languageName(source.language)} track yet.
        </p>
        <div className='flex flex-col gap-1'>
          <span className='text-zinc-400'>Source</span>
          <code className='font-mono text-xs break-all text-zinc-400'>
            {source.pathname}
          </code>
        </div>
      </div>

      <div className='mt-auto flex gap-2 border-t border-dashed border-white/10 px-4 py-3'>
        <ImportCommandButton seasonId={seasonId} size='sm' />
      </div>
    </article>
  )
}

/**
 * The top of a track card, standing in for a poster: the audio icon, the language and whether it's the
 * original or a dub, and the locale code.
 */
function TrackPoster({
  language,
  isDubbed,
  isMissing
}: Readonly<{ language: Locales; isDubbed: boolean; isMissing?: boolean }>) {
  return (
    <div
      className={cls(
        "relative m-2 flex h-42 items-center justify-center rounded-lg",
        isMissing ? "bg-zinc-900 text-zinc-600" : "bg-zinc-800/70 text-zinc-300"
      )}>
      <AudioLinesSparkles size={56} aria-hidden />

      <div className='absolute top-2.5 left-2.5 flex gap-1.5'>
        <Badge
          variant={isMissing ? "outline" : "default"}
          className={cls("font-semibold", isMissing && "border-white/20")}>
          {languageName(language)}
        </Badge>
        {isDubbed ? (
          <Badge variant='outline' className='border-white/20 text-zinc-200'>
            Dub
          </Badge>
        ) : (
          <Badge className='bg-white/10 text-zinc-200'>Original</Badge>
        )}
      </div>

      {isMissing ? (
        <Badge className='absolute top-2.5 right-2.5 bg-amber-500/15 text-amber-300'>
          Not imported
        </Badge>
      ) : (
        <code className='absolute top-3 right-3 font-mono text-xs text-zinc-400'>
          {language}
        </code>
      )}
    </div>
  )
}
