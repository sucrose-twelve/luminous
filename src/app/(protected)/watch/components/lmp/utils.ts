import { episodeTag, episodeTitle, type EpisodeNaming } from "@/libs/episode"

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
