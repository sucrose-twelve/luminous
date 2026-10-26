import { clamp, pick, uniq } from "es-toolkit"
import { userAgentFromString } from "next/server"

import type { Locales } from "@/constants/enum"
import { episodeTag } from "@/libs/episode"

import type {
  ContentEpisodes,
  WatchEpisode,
  WatchPreference,
  WatchProgress,
  WatchTrack
} from "./actions/read"
import type { LmpAdjacent, LmpProps } from "./components/lmp/types"
import { seasonLabel } from "./components/lmp/utils"

/**
 * The `preferences` column defaults, for an account that never saved a row.
 */
const DEFAULT_PREFERENCE: WatchPreference = {
  audioLanguage: null,
  autoplayNext: true,
  autoSkip: false
}

/**
 * A saved position this close to the end restarts the episode instead, so resuming never lands on the credits.
 */
const RESUME_TAIL_SECONDS = 10

/**
 * Browsers the player doesn't support, by the name `userAgentFromString` gives them: Safari on macOS, iOS,
 * and iPadOS (`Safari`, `Mobile Safari`), and every Firefox (desktop, Android, `FxiOS`, `Firefox Focus`).
 * Chrome and Edge on iOS are WebKit underneath but named apart, so they still pass.
 */
const UNSUPPORTED_BROWSER = /^(Mobile )?Safari$|Firefox/

/**
 * In-app browsers, by the token each app adds to the user agent: LINE (`Line/`), X (`Twitter for iPhone`,
 * `TwitterAndroid`), Discord (`Discord/`), Facebook and Messenger (`FBAN`, `FBAV`, `FB_IAB`), Instagram,
 * TikTok (`BytedanceWebview`, `musical_ly`), WeChat (`MicroMessenger`), and KakaoTalk. Any other app's web
 * view is caught by Android's `; wv)` marker, or by the embedded WebKit check in `browserNotice`.
 */
const IN_APP_BROWSER =
  /\b(Line|Discord)\/|\bTwitter|FBAN|FBAV|FB_IAB|Instagram|BytedanceWebview|musical_ly|MicroMessenger|KAKAOTALK|; wv\)/i

type ContentEpisode = ContentEpisodes["episodes"][number]

/**
 * Chooses which audio track of an episode to play.
 *
 * In order: the requested language (`?audio=`, or the language being played when moving to another
 * episode), the account's preferred audio language, the original audio, then the first track.
 *
 * @param tracks - The episode's tracks, original-first (as the readers order them)
 * @param requested - The language asked for, or `null`
 * @param audioLanguage - `preferences.audioLanguage`; `null` means no preference
 * @returns The track, or `null` when the episode has none
 */
export function pickTrack<T extends { language: Locales; isDubbed: boolean }>(
  tracks: readonly T[],
  requested: Locales | null,
  audioLanguage: Locales | null
) {
  return (
    tracks.find((track) => requested !== null && track.language === requested) ??
    tracks.find((track) => audioLanguage !== null && track.language === audioLanguage) ??
    tracks.find((track) => !track.isDubbed) ??
    tracks[0] ??
    null
  )
}

/**
 * Finds the episodes right before and after the current one, across seasons, in the language being played.
 *
 * Episodes without any track are skipped, so the last episode of season 1 is followed by the first playable
 * episode of season 2. A neighbor that exists but has no track in `language` doesn't count: Prev / Next
 * never switch the audio on their own (a Thai dub that stops at episode 6 has no next episode). That next
 * episode comes back as `nextFallback`, in the language it would play, so the end card can offer it.
 *
 * @param episodes - Every episode of the content, in playlist order (`readContentEpisodes`)
 * @param episodeId - The episode playing now
 * @param language - Language of the track playing now
 * @param audioLanguage - `preferences.audioLanguage`, for the language `nextFallback` would play
 */
export function resolveAdjacent(
  episodes: readonly ContentEpisode[],
  episodeId: string,
  language: Locales,
  audioLanguage: Locales | null
) {
  const index = episodes.findIndex((episode) => episode.id === episodeId)
  const isPlayable = (episode: ContentEpisode) => episode.tracks.length > 0
  const toAdjacent = (
    episode: ContentEpisode,
    track: Pick<ContentEpisode["tracks"][number], "language" | "isDubbed">
  ): LmpAdjacent => ({
    episodeId: episode.id,
    language: track.language,
    isDubbed: track.isDubbed,
    episodeNo: episode.episodeNo,
    kind: episode.kind,
    seasonKind: episode.seasonKind,
    seasonNo: episode.seasonNo,
    title: episode.title
  })
  const inLanguage = (episode: ContentEpisode | undefined) => {
    const track = episode?.tracks.find((item) => item.language === language)
    return episode && track ? toAdjacent(episode, track) : null
  }

  const before = episodes.findLast((episode, i) => i < index && isPlayable(episode))
  const after = episodes.find((episode, i) => i > index && isPlayable(episode))
  const next = inLanguage(after)
  const fallbackTrack =
    after && !next ? pickTrack(after.tracks, null, audioLanguage) : null

  return {
    prev: inLanguage(before),
    next,
    nextFallback: after && fallbackTrack ? toAdjacent(after, fallbackTrack) : null
  }
}

/**
 * Decides the second playback starts at.
 *
 * `t` from the URL wins (an audio track switch, a shared timestamp), clamped to the track. Otherwise the
 * saved position, if the content's history points at this episode and it isn't finished. Otherwise `0`.
 *
 * @param t - `?t=` in seconds, or `null`
 * @param progress - The account's history row for the content, or `null`
 * @param episodeId - The episode being opened
 * @param duration - Length of the track being opened, in seconds
 */
export function resolveStartAt(
  t: number | null,
  progress: WatchProgress | null,
  episodeId: string,
  duration: number
) {
  const isResumable = progress?.episodeId === episodeId && progress.completedAt === null

  const startAt =
    t !== null
      ? clamp(t, 0, Math.max(duration - 1, 0))
      : isResumable
        ? progress.positionSeconds
        : 0

  return duration - startAt < RESUME_TAIL_SECONDS ? 0 : startAt
}

/**
 * The watch page's title: the episode, its season (`seasonLabel`), then the content, e.g.
 * `EP 01 • Season 1 • Sousou no Frieren` or `EP 01 • The Golden Land (S2) • Sousou no Frieren`. A movie has no
 * episode part, and a season titled like its content isn't repeated.
 */
export function watchTitle({
  episode,
  season,
  content
}: Pick<WatchEpisode, "episode" | "season" | "content">) {
  const parts = [
    ...(season.kind === "movie" ? [] : [episodeTag(episode, " ")]),
    seasonLabel(season),
    content.title
  ]
  return uniq(parts).join(" • ")
}

/**
 * Which browser notice the watch page shows instead of the player, or `null` when this browser can play.
 *
 * In-app browsers come first, so LINE or X on an iPhone asks to open the link in a browser rather than
 * blaming Safari. A WebKit user agent without a `Safari/` token is an app's embedded web view (iOS and macOS):
 * every WebKit or Blink browser sends one, including Chrome, Edge, and Firefox on iOS.
 *
 * @param userAgent - The request's `User-Agent` header
 */
export function browserNotice(userAgent: string) {
  const isEmbeddedWebKit =
    userAgent.includes("AppleWebKit/") && !userAgent.includes("Safari/")
  if (isEmbeddedWebKit || IN_APP_BROWSER.test(userAgent)) return "in-app-browser" as const

  const { name } = userAgentFromString(userAgent).browser
  if (name && UNSUPPORTED_BROWSER.test(name)) return "unsupported-browser" as const

  return null
}

/**
 * Where the player's Back button leads: the content page of the season being played.
 */
export function toBackHref(seasonId: string) {
  return `/content/${seasonId}`
}

/**
 * The account's preferences, or the column defaults when it never saved a row.
 */
export function withDefaultPreference(preference: WatchPreference | null) {
  return preference ?? DEFAULT_PREFERENCE
}

/**
 * Turns what the page loaded into the player's props.
 *
 * @param current - The episode being opened (`readWatchEpisode`)
 * @param track - The track of it to play (`pickTrack`)
 * @param contentEpisodes - Every episode of its content (`readContentEpisodes`)
 * @param progress - The account's history row for the content (`readProgress`)
 * @param preference - The account's preferences (`withDefaultPreference`)
 * @param t - `?t=` in seconds, or `null`
 */
export function toPlayerProps({
  current,
  track,
  contentEpisodes,
  progress,
  preference,
  t
}: Readonly<{
  current: WatchEpisode
  track: WatchTrack
  contentEpisodes: ContentEpisodes
  progress: WatchProgress | null
  preference: WatchPreference
  t: number | null
}>): LmpProps {
  const { audioLanguage, autoplayNext, autoSkip } = preference
  const { episode, season, content } = current

  return {
    track,
    audioTracks: current.tracks.map((audioTrack) =>
      pick(audioTrack, ["id", "language", "isDubbed"])
    ),
    episode,
    season,
    content,
    ...resolveAdjacent(
      contentEpisodes.episodes,
      episode.id,
      track.language,
      audioLanguage
    ),
    startAt: resolveStartAt(t, progress, episode.id, track.duration),
    preference: { autoplayNext, autoSkip },
    playlist: {
      seasons: contentEpisodes.seasons,
      episodes: contentEpisodes.episodes.map((contentEpisode) => ({
        ...pick(contentEpisode, [
          "id",
          "seasonId",
          "episodeNo",
          "kind",
          "title",
          "hasThumbnail"
        ]),
        audios: contentEpisode.tracks.map((episodeTrack) =>
          pick(episodeTrack, ["language", "isDubbed"])
        )
      }))
    },
    backHref: toBackHref(season.id)
  }
}
