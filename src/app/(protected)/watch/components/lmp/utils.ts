import { episodeTag, episodeTitle, type EpisodeNaming } from "@/libs/episode"
import { pad2 } from "@/libs/utils"

/**
 * Formats seconds as `mm:ss`, or `h:mm:ss` when the episode is an hour or longer, so both ends of the
 * progress bar use the same shape. Negative and `NaN` read as `0`.
 *
 * @param seconds - The time to format
 * @param totalSeconds - The episode duration, which picks the format
 *
 * @example
 * ```ts
 * formatTime(312, 1440) // "05:12"
 * formatTime(312, 6120) // "0:05:12"
 * ```
 */
export function formatTime(seconds: number, totalSeconds: number) {
  const value = Math.floor(Number.isFinite(seconds) && seconds > 0 ? seconds : 0)
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)

  return totalSeconds >= 3600
    ? `${hours}:${pad2(minutes)}:${pad2(value % 60)}`
    : `${pad2(hours * 60 + minutes)}:${pad2(value % 60)}`
}

/**
 * Reads seconds out for screen readers, e.g. `"5 minutes 12 seconds"`.
 */
export function formatSpokenTime(seconds: number) {
  const value = Math.floor(Number.isFinite(seconds) && seconds > 0 ? seconds : 0)
  const parts = [
    [Math.floor(value / 3600), "hour"],
    [Math.floor((value % 3600) / 60), "minute"],
    [value % 60, "second"]
  ] as const

  const spoken = parts
    .filter(([amount]) => amount > 0)
    .map(([amount, unit]) => `${amount} ${unit}${amount === 1 ? "" : "s"}`)
  return spoken.length ? spoken.join(" ") : "0 seconds"
}

/**
 * A season's short tag: `S2` for a numbered season or spinoff, `SP` for a special, `null` for an unnumbered
 * spinoff (its title names it instead).
 */
function seasonTag(kind: Content.SeasonKind, seasonNo: number | null) {
  if (kind === "special") return "SP"
  return seasonNo === null ? null : `S${seasonNo}`
}

/**
 * The episode's short label: its `episodeTag` (`EP01`, `SP - 01`), led by the season's tag (`S2 EP01`,
 * `SP EP01`) when the content has more than one season. A movie is a single episode, so it reads `Movie`.
 *
 * @example
 * ```ts
 * episodeLabel({ episodeNo: 1, kind: "regular", title: "01" }, { kind: "season", seasonNo: 2 }, true) // "S2 EP01"
 * episodeLabel({ episodeNo: 14, kind: "ova", title: "OVA - 01" }, { kind: "season", seasonNo: 1 }, true) // "S1 OVA - 01"
 * episodeLabel({ episodeNo: 1, kind: "regular", title: null }, { kind: "movie", seasonNo: null }, true) // "Movie"
 * ```
 */
export function episodeLabel(
  episode: EpisodeNaming,
  { kind, seasonNo }: Readonly<{ kind: Content.SeasonKind; seasonNo: number | null }>,
  hasSeasons: boolean
) {
  if (kind === "movie") return "Movie"

  const tag = hasSeasons ? seasonTag(kind, seasonNo) : null
  return tag ? `${tag} ${episodeTag(episode)}` : episodeTag(episode)
}

/**
 * Adds the episode's title to its label when it has one worth showing (`episodeTitle`):
 * `S1 EP01 · The Journey's End`, but `S1 EP01` for a title that is only the file name.
 */
export function withEpisodeTitle(label: string, episode: EpisodeNaming) {
  const title = episodeTitle(episode)
  return title ? `${label} · ${title}` : label
}

const displayNames = new Map<string, Intl.DisplayNames>()

/**
 * Names an audio track in its own language (an endonym): the original track as `Original (日本語)`, a dub as
 * `ไทย`. One `Intl.DisplayNames` per language is kept for reuse.
 *
 * @example
 * ```ts
 * languageLabel("ja-JP", false) // "Original (日本語)"
 * languageLabel("th-TH", true) // "ไทย"
 * ```
 */
export function languageLabel(language: string, isDubbed: boolean) {
  const [base] = language.split("-")
  let names = displayNames.get(language)
  if (!names) {
    names = new Intl.DisplayNames([language], { type: "language" })
    displayNames.set(language, names)
  }

  const endonym = names.of(base) ?? language
  return isDubbed ? endonym : `Original (${endonym})`
}

/**
 * Finds the fragment that contains a time, by binary search over fragments sorted by `time`.
 *
 * @param fragments - The track's fragment index, ordered by `time`
 * @param time - Seconds on the episode timeline
 * @returns The index of the last fragment starting at or before `time`; `0` for a time before the first one
 *
 * @example
 * ```ts
 * findFragmentIndex([{ time: 0 }, { time: 4 }, { time: 8 }], 5) // 1
 * ```
 */
export function findFragmentIndex(
  fragments: readonly Pick<Content.Fragment, "time">[],
  time: number
) {
  let low = 0
  let high = fragments.length - 1

  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (fragments[middle].time <= time) low = middle
    else high = middle - 1
  }

  return low
}

/**
 * Where the sprite sheet tile for a time sits, in pixels from the sheet's top-left. Tile `i` shows
 * `i × interval` seconds; times past the last tile use the last one.
 *
 * @example
 * ```ts
 * spriteTile({ interval: 10, width: 192, height: 108, columns: 10, count: 144 }, 125) // { x: 384, y: 108 }
 * ```
 */
export function spriteTile(grid: Readonly<Content.SpriteGrid>, time: number) {
  const index = Math.min(Math.max(Math.floor(time / grid.interval), 0), grid.count - 1)
  return {
    x: (index % grid.columns) * grid.width,
    y: Math.floor(index / grid.columns) * grid.height
  }
}
