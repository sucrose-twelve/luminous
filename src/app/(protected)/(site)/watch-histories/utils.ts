import { formatDistanceStrict } from "date-fns"

import { KIND_LABELS } from "@/constants/labels"
import { episodeTag, episodeTitle } from "@/libs/episode"
import { genreText } from "@/libs/genre"
import { seasonName } from "@/libs/season"
import { formatSpokenTime, formatTime } from "@/libs/time"

import type { HistoryRow } from "./actions/read"
import type {
  HistoryKind,
  HistorySort,
  HistoryStatus,
  HistoryView
} from "./validator.zod"

/**
 * Days without watching after which an unfinished content counts as on hold.
 */
export const ON_HOLD_AFTER_DAYS = 30

/**
 * The `contents.kind` values each kind tab matches.
 */
export const HISTORY_KIND_FILTERS: Record<HistoryKind, Content.Kind[]> = {
  anime: ["anime_series"],
  series: ["tv_series", "series", "shows"],
  movie: ["movie"]
}

export const HISTORY_KIND_LABELS: Record<HistoryKind, string> = {
  anime: "Anime",
  series: "Series",
  movie: "Movies"
}

/**
 * The status tabs' labels; the cards' chips use the longer `HISTORY_STATUS_CHIPS`.
 */
export const HISTORY_STATUS_LABELS: Record<HistoryStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  on_hold: "On Hold"
}

export const HISTORY_STATUS_CHIPS: Record<HistoryStatus, string> = {
  watching: "Currently Watching",
  completed: "Completed",
  on_hold: "On Hold"
}

export const HISTORY_SORT_LABELS: Record<HistorySort, string> = {
  recent: "Recently Watched",
  oldest: "Oldest Watched",
  title: "Title A–Z"
}

export const HISTORY_VIEW_LABELS: Record<HistoryView, string> = {
  grid: "Grid view",
  list: "List view"
}

/**
 * One history card, ready to render: the episode to show (the saved one, or the next one when the saved one is
 * finished) and its progress, already formatted on the server.
 */
export type HistoryItem = {
  id: string
  status: HistoryStatus
  title: string
  altTitle: string | null
  kindLabel: string
  genres: string[]
  seasonId: string
  episodeLabel: string
  episodeTitle: string | null
  image: string
  time: string
  spokenTime: string
  percent: number
  watchedAgo: string
  continueHref: string | null
}

/**
 * Maps a history row to its card. A finished episode with a next one shows that next episode from `0`; a
 * completed content shows its last episode in full, since `completed_at` is set from 90 % on.
 *
 * @param row - One row of `readWatchHistories`
 * @param now - The time `watchedAgo` counts from, read once per render so every card agrees
 */
export function toHistoryItem(row: HistoryRow, now: Date): HistoryItem {
  const { history, content, status, next } = row
  const isNext = history.completedAt !== null && next !== null

  const episode = isNext
    ? { id: next.id, episodeNo: next.episodeNo, kind: next.kind, title: next.title }
    : row.episode
  const season = isNext
    ? {
        id: next.seasonId,
        kind: next.seasonKind,
        seasonNo: next.seasonNo,
        title: next.seasonTitle
      }
    : row.season
  const hasThumbnail = isNext ? next.hasThumbnail : row.episode.hasThumbnail

  const duration = isNext ? next.duration : history.durationSeconds
  const position = isNext
    ? 0
    : status === "completed"
      ? duration
      : history.positionSeconds
  const altTitle = content.altTitles.JP ?? content.altTitles.EN ?? null

  return {
    id: history.id,
    status,
    title: content.title,
    altTitle: altTitle && altTitle !== content.title ? altTitle : null,
    kindLabel: KIND_LABELS[content.kind],
    genres: content.genres.map(genreText),
    seasonId: season.id,
    episodeLabel: episodeLabelOf(content.kind, season, episode),
    episodeTitle: episodeTitle(episode),
    image: hasThumbnail
      ? `/api/art/thumbnail/${episode.id}`
      : `/api/art/poster/${season.id}`,
    time: `${formatTime(position, duration)} / ${formatTime(duration, duration)}`,
    spokenTime: `${formatSpokenTime(position)} of ${formatSpokenTime(duration)}`,
    percent: duration > 0 ? Math.min(100, Math.round((position / duration) * 100)) : 0,
    watchedAgo: formatDistanceStrict(history.watchedAt, now, { addSuffix: true }),
    continueHref: status === "completed" ? null : `/watch?vid=${episode.id}`
  }
}

/**
 * Where the episode sits in the content: `Season 1 • Episode 24`, `Season 1 • SP - 01` for a special, the
 * season's name alone for a movie season, and `Full Feature Film` for a movie.
 */
function episodeLabelOf(
  kind: Content.Kind,
  season: Parameters<typeof seasonName>[0],
  episode: Parameters<typeof episodeTag>[0]
) {
  if (kind === "movie") return "Full Feature Film"
  if (season.kind === "movie") return seasonName(season)

  const tag =
    episode.kind === "regular" ? `Episode ${episode.episodeNo}` : episodeTag(episode)
  return `${seasonName(season)} • ${tag}`
}
