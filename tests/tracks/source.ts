import fs from "fs"
import path from "path"

import { EPISODE_FILE_PATTERN, EPISODE_FILE_TAGS } from "./constants"
import { fileStem, toStoredPath } from "./utils"

export type EpisodeFile = {
  episodeNo: number
  kind: Content.EpisodeKind
  title: string
  path: string
}

/**
 * Lists the episode files of one folder, sorted by episode number. Other files (art, notes) and folders
 * (`.original/`) are ignored.
 *
 * @example
 * ```ts
 * // 01.mp4         → { episodeNo: 1, kind: "regular", title: "01" }
 * // 14 - SP1.mp4   → { episodeNo: 14, kind: "special", title: "SP - 01" }
 * // 14 - OVA1.mp4  → { episodeNo: 14, kind: "ova", title: "OVA - 01" }
 * ```
 */
async function findEpisodeFiles(directory: string) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true })

  return entries
    .map((entry): EpisodeFile | null => {
      const match = EPISODE_FILE_PATTERN.exec(entry.name)
      if (!entry.isFile() || !match) return null

      const [, episodeNo, tag, tagNo] = match
      return {
        episodeNo: Number(episodeNo),
        kind: tag ? EPISODE_FILE_TAGS[tag] : "regular",
        title: tag ? `${tag} - ${fileStem(Number(tagNo))}` : path.parse(entry.name).name,
        path: toStoredPath(path.join(directory, entry.name))
      }
    })
    .filter((file) => file !== null)
    .sort((a, b) => a.episodeNo - b.episodeNo)
}

/**
 * Lists the episode files of one season source: the files of its folder or, for a movie, the source file itself
 * as episode 1, titled by its file name.
 *
 * @returns The files, or `null` when the source isn't on disk (a dub listed before its files exist)
 */
export async function findSourceFiles(
  source: Content.SeasonSource,
  kind: Content.SeasonKind
): Promise<EpisodeFile[] | null> {
  const stats = await fs.promises.stat(source.pathname).catch(() => null)

  if (kind === "movie") {
    if (!stats?.isFile()) return null
    const filePath = toStoredPath(source.pathname)
    return [
      { episodeNo: 1, kind: "regular", title: path.parse(filePath).name, path: filePath }
    ]
  }

  return stats?.isDirectory() ? findEpisodeFiles(source.pathname) : null
}
