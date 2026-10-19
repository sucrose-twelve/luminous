import { z } from "zod"

import {
  readContentEpisodes,
  readPreference,
  readProgress,
  readWatchEpisode
} from "./actions/read"
import { LmpLoader } from "./components/lmp/lmp-loader"
import { WatchNotice } from "./components/watch-notice"
import { pickTrack, toPlayerProps, withDefaultPreference } from "./utils"
import { queryValidator } from "./validator.nuqs"

/**
 * The page blocks by design (plain SSR that reads the session), so it opts out of instant-navigation
 * validation. The root layout's `false` only covers the static-shell check; each page is validated on its own.
 */
export const instant = false

export default async function Watch({ searchParams }: NextSearchParams) {
  const { vid, audio, t } = queryValidator.parse(await searchParams)
  if (!vid || !z.uuid().safeParse(vid).success) return <WatchNotice kind='invalid-link' />

  const current = await readWatchEpisode(vid)
  if (!current) return <WatchNotice kind='not-found' />

  const [contentEpisodes, progress, savedPreference] = await Promise.all([
    readContentEpisodes(current.content.id),
    readProgress(current.content.id),
    readPreference()
  ])
  const preference = withDefaultPreference(savedPreference)

  const track = pickTrack(current.tracks, audio, preference.audioLanguage)
  if (!track) return <WatchNotice kind='not-found' />

  return (
    <LmpLoader
      {...toPlayerProps({ current, track, contentEpisodes, progress, preference, t })}
    />
  )
}
