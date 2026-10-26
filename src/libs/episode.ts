import { EPISODE_KIND_TAGS } from "@/constants"
import { pad2 } from "@/libs/utils"

export type EpisodeNaming = Readonly<{
  episodeNo: number
  kind: Content.EpisodeKind
  title: string | null
}>

/**
 * An episode's short tag: `EP01` for a regular episode. A special or OVA is tagged by its title, which the
 * import sets from its file name (`14 - SP1.mp4` → `SP - 01`), since `episodeNo` only orders it.
 *
 * @param gap - Put between `EP` and the number: the episode cards read `EP 01`
 *
 * @example
 * ```ts
 * episodeTag({ episodeNo: 1, kind: "regular", title: "01" }) // "EP01"
 * episodeTag({ episodeNo: 14, kind: "special", title: "SP - 01" }) // "SP - 01"
 * ```
 */
export function episodeTag({ episodeNo, kind, title }: EpisodeNaming, gap = "") {
  if (kind === "regular") return `EP${gap}${pad2(episodeNo)}`
  return title || EPISODE_KIND_TAGS[kind]
}

/**
 * The title to show after `episodeTag`, or `null` when it would only repeat it: a special's or OVA's title is
 * its tag, and the import titles a regular episode by its file name (`01.mp4` → `01`).
 *
 * @example
 * ```ts
 * episodeTitle({ episodeNo: 1, kind: "regular", title: "01" }) // null
 * episodeTitle({ episodeNo: 1, kind: "regular", title: "The Journey's End" }) // "The Journey's End"
 * ```
 */
export function episodeTitle({ episodeNo, kind, title }: EpisodeNaming) {
  if (kind !== "regular" || !title || Number(title) === episodeNo) return null
  return title
}
