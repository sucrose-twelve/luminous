import { eq } from "drizzle-orm"
import { pick } from "es-toolkit"
import { cacheLife, cacheTag } from "next/cache"

import { db, schema } from "@/drizzle"
import { contentColumns, episodeColumns, seasonColumns } from "@/drizzle/table-columns"
import { seasonArtDirectory } from "@/libs/media"

/**
 * Looks up a season's poster path. A poster may sit in any folder, so it has no folder to stay inside.
 *
 * Server-only: the result holds file paths, so never pass it to a Client Component.
 */
export async function readPoster(seasonId: string) {
  "use cache"
  cacheTag(`seasons/${seasonId}`)
  cacheLife("hours")

  const [row] = await db
    .select({ path: seasonColumns.poster })
    .from(schema.seasons)
    .where(eq(schema.seasons.id, seasonId))
    .limit(1)

  return row ? { ...row, directory: null } : null
}

/**
 * Looks up an episode's thumbnail path and the art folder of its season.
 *
 * Server-only: the result holds file paths, so never pass it to a Client Component.
 */
export async function readThumbnail(episodeId: string) {
  "use cache"
  cacheTag(`episodes/${episodeId}`)
  cacheLife("hours")

  const [row] = await db
    .select({
      path: episodeColumns.thumbnail,
      season: pick(seasonColumns, ["kind", "seasonNo", "sources"]),
      sourceDir: contentColumns.sourceDir
    })
    .from(schema.episodes)
    .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
    .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
    .where(eq(schema.episodes.id, episodeId))
    .limit(1)

  /**
   * A season whose primary source isn't inside `sourceDir` has no art folder: answer "not found" rather than
   * skip the check.
   */
  const directory = row && seasonArtDirectory(row.sourceDir, row.season)
  return row && directory ? { path: row.path, directory } : null
}

/**
 * Looks up an episode's hover-preview sprite sheet path and the art folder of its season.
 *
 * Server-only: the result holds file paths, so never pass it to a Client Component.
 */
export async function readSprite(episodeId: string) {
  "use cache"
  cacheTag(`episodes/${episodeId}`)
  cacheLife("hours")

  const [row] = await db
    .select({
      path: episodeColumns.sprite,
      season: pick(seasonColumns, ["kind", "seasonNo", "sources"]),
      sourceDir: contentColumns.sourceDir
    })
    .from(schema.episodes)
    .innerJoin(schema.seasons, eq(schema.episodes.seasonId, schema.seasons.id))
    .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
    .where(eq(schema.episodes.id, episodeId))
    .limit(1)

  /**
   * A season whose primary source isn't inside `sourceDir` has no art folder: answer "not found" rather than
   * skip the check.
   */
  const directory = row && seasonArtDirectory(row.sourceDir, row.season)
  return row && directory ? { path: row.path, directory } : null
}
