import fs from "fs"
import { setTimeout } from "node:timers/promises"
import path from "path"
import { parseArgs } from "util"

import { eq, sql } from "drizzle-orm"
import { isEqual } from "es-toolkit"
import { z } from "zod"

import { db, schema } from "@/drizzle"
import { COLOR, logger } from "@/libs/logger"
import { primarySource, seasonArtDirectory } from "@/libs/media"

import {
  missingTools,
  planRemux,
  removeBackups,
  remuxFile,
  type RemuxPlan
} from "./tracks/ffmpeg"
import { readTrackFile } from "./tracks/mp4"
import { findSourceFiles, type EpisodeFile } from "./tracks/source"
import { spriteGrid, writeSprite } from "./tracks/sprite"
import { writeThumbnail } from "./tracks/thumbnail"
import { errorMessage, fileStem, toStoredPath } from "./tracks/utils"
import { argsValidator, type ArgsValidator } from "./tracks/validator.zod"

type Season = {
  id: string
  kind: Content.SeasonKind
  name: string
  sources: Content.SeasonSource[]
}

type SourceFiles = Content.SeasonSource & { files: EpisodeFile[] }

type TrackFile = EpisodeFile &
  Pick<Content.SeasonSource, "language" | "isDubbed"> &
  Awaited<ReturnType<typeof readTrackFile>>

type ImportedEpisode = {
  id: string
  episodeNo: number
  skips: Content.Skip[]
  spriteGrid: Content.SpriteGrid | null
}

/**
 * Logs every problem, then stops the run through `main`'s catch.
 */
function stop(problems: string[], summary: string): never {
  problems.forEach((problem) => logger(`⛔ ${problem}`))
  throw new Error(summary)
}

/**
 * Finds the files of every source. A dub that isn't on disk yet is skipped, unless it's the primary source
 * (`primarySource`: the original, or the first dub when there's none): a missing primary source stops the run, and
 * so do two files of one source with the same episode number (`14.mp4` and `14 - SP1.mp4`).
 */
async function scanSources(season: Season) {
  const primary = primarySource(season.sources)
  const scanned: SourceFiles[] = []
  const problems: string[] = []

  for (const source of season.sources) {
    const files = await findSourceFiles(source, season.kind)

    if (files) {
      scanned.push({ ...source, files })

      for (const [index, file] of files.entries()) {
        const previous = files[index - 1]
        if (previous?.episodeNo === file.episodeNo)
          problems.push(
            `${file.path}: episode ${file.episodeNo} is already ${previous.path}`
          )
      }
    } else if (source !== primary) {
      logger(`⚠️ Skipped the ${source.language} dub: ${source.pathname} not found`)
    } else {
      throw new Error(
        `The ${source.isDubbed ? "dub" : "original"} source of ${season.name} is not on disk: ${source.pathname}`
      )
    }
  }

  if (problems.length > 0)
    stop(
      problems,
      `${problems.length} file(s) share an episode number; nothing was changed`
    )

  return scanned
}

/**
 * Checks every file before remuxing any, so a file that needs a video re-encode stops the run while the library
 * is still untouched. Then remuxes the files that need it, one at a time.
 */
async function remuxSources(scanned: SourceFiles[]) {
  const plans: RemuxPlan[] = []
  const problems: string[] = []

  for (const file of scanned.flatMap((source) => source.files)) {
    try {
      const plan = await planRemux(file)
      if (plan) plans.push(plan)
    } catch (error) {
      problems.push(`${file.path}: ${errorMessage(error)}`)
    }
  }

  if (problems.length > 0)
    stop(problems, `${problems.length} file(s) can't be remuxed; nothing was changed`)

  for (const [index, plan] of plans.entries()) {
    const remuxStartedAt = new Date()
    await remuxFile(plan)
    logger(
      `🔧 Remuxed ${index + 1}/${plans.length} (${plan.reasons.join(", ")}) ${COLOR.FG.Gray}${plan.file.path}`,
      remuxStartedAt
    )
  }
}

/**
 * Reads every file before anything is written, so one bad file doesn't leave a half-imported season.
 */
async function readSourceTracks(scanned: SourceFiles[]) {
  const tracks: TrackFile[] = []

  for (const source of scanned) {
    for (const file of source.files) {
      try {
        tracks.push({
          ...file,
          language: source.language,
          isDubbed: source.isDubbed,
          ...(await readTrackFile(file.path))
        })
        logger(
          `📼 ${source.language} E${fileStem(file.episodeNo)} ${file.kind} ${COLOR.FG.Gray}${file.path}`
        )
      } catch (error) {
        throw new Error(`${file.path}: ${errorMessage(error)}`)
      }
    }
  }

  if (tracks.length === 0) {
    throw new Error(
      `No episode files (01.mp4, 02.mp4, …) in ${scanned.map((source) => source.pathname).join(", ")}`
    )
  }

  return tracks
}

/**
 * Upserts one episode per episode number and one track per file, in one transaction.
 *
 * @returns The season's imported episodes, with what the art step needs
 */
async function importTracks(
  seasonId: string,
  tracks: TrackFile[]
): Promise<ImportedEpisode[]> {
  /**
   * The original's file name titles the episode and sets its kind: dubs go first so the original's entry
   * overwrites theirs. A season with only dubs is titled by its dubs.
   */
  const episodeNames = new Map(
    tracks
      .toSorted((a, b) => Number(b.isDubbed) - Number(a.isDubbed))
      .map((track) => [track.episodeNo, { kind: track.kind, title: track.title }])
  )

  return db.transaction(async (tx) => {
    const episodes = await tx
      .insert(schema.episodes)
      .values(
        [...episodeNames].map(([episodeNo, { kind, title }]) => ({
          seasonId,
          episodeNo,
          kind,
          title
        }))
      )
      .onConflictDoUpdate({
        target: [schema.episodes.seasonId, schema.episodes.episodeNo],
        set: { kind: sql`excluded.kind`, title: sql`excluded.title` }
      })
      .returning({
        id: schema.episodes.id,
        episodeNo: schema.episodes.episodeNo,
        skips: schema.episodes.skips,
        spriteGrid: schema.episodes.spriteGrid
      })

    const episodeIds = new Map(episodes.map((episode) => [episode.episodeNo, episode.id]))

    await tx
      .insert(schema.tracks)
      .values(
        tracks.map((track) => ({
          episodeId: episodeIds.get(track.episodeNo)!,
          language: track.language,
          isDubbed: track.isDubbed,
          path: track.path,
          mimeCodec: track.mimeCodec,
          size: track.size,
          duration: track.duration,
          width: track.width,
          height: track.height,
          initEnd: track.initEnd,
          fragments: track.fragments
        }))
      )
      .onConflictDoUpdate({
        target: [schema.tracks.episodeId, schema.tracks.language],
        set: {
          isDubbed: sql`excluded.is_dubbed`,
          path: sql`excluded.path`,
          mimeCodec: sql`excluded.mime_codec`,
          size: sql`excluded.size_bytes`,
          duration: sql`excluded.duration_seconds`,
          width: sql`excluded.width`,
          height: sql`excluded.height`,
          initEnd: sql`excluded.init_end`,
          fragments: sql`excluded.fragments`
        }
      })

    return episodes
  })
}

/**
 * Creates each episode's thumbnail and hover-preview sprite sheet from a dubbed track (`isDubbed: true`, the
 * first by language) when the episode has one, otherwise from its original, one set shared by every language.
 *
 * An existing thumbnail is kept (it may be hand-picked) and an existing sprite whose grid matches the DB is
 * kept; `force` regenerates both. The DB is updated per episode, right after its files, so a crash midway
 * leaves it matching what's on disk.
 */
async function generateArt(
  episodes: ImportedEpisode[],
  tracks: TrackFile[],
  directory: string,
  force: boolean
) {
  await fs.promises.mkdir(directory, { recursive: true })

  for (const episode of episodes) {
    const artStartedAt = new Date()
    const track = tracks
      .filter((item) => item.episodeNo === episode.episodeNo)
      .toSorted(
        (a, b) =>
          Number(b.isDubbed) - Number(a.isDubbed) || a.language.localeCompare(b.language)
      )[0]

    const stem = fileStem(episode.episodeNo)
    const thumbnail = toStoredPath(path.join(directory, `${stem}.webp`))
    const sprite = toStoredPath(path.join(directory, `${stem}-sprite-sheet.webp`))
    const grid = spriteGrid(track.duration)
    const done: string[] = []

    if (force || !fs.existsSync(thumbnail)) {
      await writeThumbnail(track.path, track.duration, episode.skips, thumbnail)
      done.push("thumbnail")
    }

    if (force || !fs.existsSync(sprite) || !isEqual(episode.spriteGrid, grid)) {
      await writeSprite(track.path, grid, sprite)
      done.push(`sprite ${grid.count} tiles`)
    }

    await db
      .update(schema.episodes)
      .set({ thumbnail, sprite, spriteGrid: grid })
      .where(eq(schema.episodes.id, episode.id))

    logger(
      `🖼️ E${stem} ${track.language} ${done.length > 0 ? done.join(", ") : "kept existing art"} ${COLOR.FG.Gray}${path.dirname(thumbnail)}`,
      artStartedAt
    )
  }
}

/**
 * Loads the season and checks what the run needs before anything on disk or in the DB changes.
 */
async function loadSeason({
  season: seasonId
}: ArgsValidator): Promise<Season & { artDirectory: string }> {
  const missing = missingTools()
  if (missing.length > 0)
    stop(
      missing.map((tool) => `${tool} is not in the PATH`),
      "Install ffmpeg first"
    )

  const [row] = await db
    .select({
      kind: schema.seasons.kind,
      seasonNo: schema.seasons.seasonNo,
      title: schema.seasons.title,
      sources: schema.seasons.sources,
      sourceDir: schema.contents.sourceDir
    })
    .from(schema.seasons)
    .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
    .where(eq(schema.seasons.id, seasonId))
    .limit(1)

  if (!row) throw new Error(`Season ${seasonId} not found`)

  const name = row.title ?? (row.seasonNo === null ? row.kind : `season ${row.seasonNo}`)
  const artDirectory = seasonArtDirectory(row.sourceDir, row)
  if (!artDirectory)
    throw new Error(
      `${name} has no source inside ${row.sourceDir} for its art folder (or a season has no season number)`
    )

  return { id: seasonId, kind: row.kind, name, sources: row.sources, artDirectory }
}

/**
 * Imports one season from the sources listed on it (`seasons.sources`): remuxes its files if asked, writes its
 * episodes and tracks, then creates each episode's thumbnail and sprite sheet.
 *
 * Usage (from the repo root):
 * ```bash
 * bun tests/track.spec.ts --season 019a2b3c-…
 * bun tests/track.spec.ts --season 019a2b3c-… --remux --force
 * ```
 *
 * Each source gives its language and whether it's dubbed: only `isDubbed` says so, never the folder name. A
 * season may have only dubs (no `isDubbed: false` source). A series source is a folder, a movie source the file:
 * ```
 * <CONTENTS_SOURCE_DIR>/Frieren/1/01.mp4                original audio, source "<CONTENTS_SOURCE_DIR>/Frieren/1"
 * <CONTENTS_SOURCE_DIR>/Frieren/Thai Dub/1/01.mp4       dubbed, source "<CONTENTS_SOURCE_DIR>/Frieren/Thai Dub/1"
 * <CONTENTS_SOURCE_DIR>/SAO/Ordinal Scale.mp4           a movie's original audio, imported as episode 1
 * ```
 *
 * In a folder, only files named like `01.mp4`, `14 - SP1.mp4` or `14 - OVA1.mp4` are imported: the leading
 * number becomes `episodeNo`. `01.mp4` is a `regular` episode titled `01`; `14 - SP1.mp4` is a `special` titled
 * `SP - 01` and `14 - OVA1.mp4` an `ova` titled `OVA - 01`. A source that isn't on disk yet is skipped, except the
 * primary one (the original, or the first dub without one), which stops the run. A dub with fewer episodes than
 * the original simply gives those episodes one more track.
 *
 * - `--remux` turns files that aren't fragmented MP4 into one (stream copy, fast), re-encodes audio other than
 *   AAC/Opus to AAC, and re-tags HEVC as `hvc1`. Each replaced file is kept in `<folder>/.original/` and deleted
 *   only when the whole run has succeeded; if any step fails, it stays there to recover from. Files that
 *   need a video re-encode (Hi10P, MPEG-2, …) stop the run before anything is changed. Without it, files must
 *   already be fragmented MP4.
 * - Art goes to the season's art folder in the content's `sourceDir` (`seasonArtDirectory`, e.g.
 *   `<CONTENTS_SOURCE_DIR>/Frieren/Thumbnails/1/`, `<CONTENTS_SOURCE_DIR>/SAO/Thumbnails/Ordinal Scale/`, or
 *   `<CONTENTS_SOURCE_DIR>/SAO/Thumbnails/Alternative Gun Gale Online/1/` for a spinoff), made from a dub's file
 *   (the original's when the episode has no dub):
 *   `01.webp` (640×360) and `01-sprite-sheet.webp` (192×108 tiles). `--force` regenerates existing art.
 *
 * Safe to re-run: episodes upsert on `(seasonId, episodeNo)` and tracks on `(episodeId, language)`.
 */
async function main() {
  const startedAt = new Date()

  const { values } = parseArgs({
    options: {
      season: { type: "string" },
      remux: { type: "boolean" },
      force: { type: "boolean" }
    }
  })

  const parsed = argsValidator.safeParse(values)
  if (!parsed.success) {
    logger(
      `❌ Invalid arguments: ${JSON.stringify(z.flattenError(parsed.error).fieldErrors)}`
    )
    return
  }

  const season = await loadSeason(parsed.data)
  const scanned = await scanSources(season)
  if (parsed.data.remux) await remuxSources(scanned)

  const tracks = await readSourceTracks(scanned)
  const episodes = await importTracks(season.id, tracks)
  logger(
    `📥 Imported ${episodes.length} episodes and ${tracks.length} tracks for ${season.name}`
  )

  await generateArt(episodes, tracks, season.artDirectory, parsed.data.force)

  /**
   * Last, so a failure in any step above leaves every original in `.original/` to recover from. Covers the whole
   * season, so backups left by an earlier run that stopped midway go too, now that their files checked out.
   */
  if (parsed.data.remux) {
    const removed = await removeBackups(tracks.map((track) => track.path))
    if (removed > 0) logger(`🧹 Deleted ${removed} original(s) from .original/`)
  }

  logger(`🎉 Done with ${season.name}`, startedAt)
  logger(
    '⚠️ A running server serves cached art paths until `cacheLife("hours")` expires or it restarts'
  )
}

main()
  .catch((error) => logger(`❌ ${errorMessage(error)}`))
  .finally(() => db.$client.end())
