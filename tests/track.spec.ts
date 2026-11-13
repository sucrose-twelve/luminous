import fs from "fs"
import { setTimeout } from "node:timers/promises"
import path from "path"
import { parseArgs } from "util"

import { and, asc, eq, inArray, sql } from "drizzle-orm"
import { groupBy, isEqual } from "es-toolkit"
import { z } from "zod"

import { IMPORT_EXIT_CODES, ONGOING_STATUSES } from "@/constants"
import { db, schema } from "@/drizzle"
import { writeThumbnail } from "@/libs/ffmpeg"
import { COLOR, logger } from "@/libs/logger"
import { artTrack, primarySource, seasonArtDirectory } from "@/libs/media"

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
import { thumbnailTime } from "./tracks/thumbnail"
import { errorMessage, fileStem, toStoredPath } from "./tracks/utils"
import { argsValidator, type ArgsValidator } from "./tracks/validator.zod"

type Season = {
  id: string
  kind: Content.SeasonKind
  name: string
  sources: Content.SeasonSource[]
  artDirectory: string
}

type SeasonRow = Awaited<ReturnType<typeof findSeasons>>[number]

type CancelCheck = () => void

type SourceFiles = Content.SeasonSource & { files: EpisodeFile[] }

type TrackFile = EpisodeFile &
  Pick<Content.SeasonSource, "language" | "isDubbed"> &
  Awaited<ReturnType<typeof readTrackFile>>

type ImportedEpisode = {
  id: string
  episodeNo: number
  skips: Content.Skip[]
  spriteGrid: Content.SpriteGrid | null
  /**
   * The languages the episode had tracks in before this run, so the art step can tell when its art track is new.
   */
  previousLanguages: string[]
}

/**
 * A season with nothing on disk to import yet: it stops a `--season` run, but a run over every ongoing season
 * only skips it, since an upcoming season often has no files.
 */
class NotOnDiskError extends Error {}

/**
 * The control panel asked the run to stop (`--cancel-file`). Thrown only at a safe point, between files, so
 * nothing is left half-written.
 */
class CancelledError extends Error {}

/**
 * Makes the check that throws `CancelledError` once the cancel file exists. It runs between seasons, remuxed
 * files, the DB write, and each episode's art; a run without `--cancel-file` never stops.
 */
function cancelCheck(cancelFile: string | undefined): CancelCheck {
  return () => {
    if (cancelFile && fs.existsSync(cancelFile)) {
      throw new CancelledError("Cancelled from the control panel")
    }
  }
}

/**
 * Logs every problem, then stops the season's import through the catch in `main`.
 */
function stop(problems: string[], summary: string): never {
  problems.forEach((problem) => logger(`⛔ ${problem}`))
  throw new Error(summary)
}

/**
 * Finds the files of every source. A dub that isn't on disk yet is skipped, unless it's the primary source
 * (`primarySource`: the original, or the first dub when there's none): a missing primary source stops the season, and
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
      throw new NotOnDiskError(
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
 * Checks every file before remuxing any, so a file that needs a video re-encode stops the season while the library
 * is still untouched. Then remuxes the files that need it, one at a time.
 */
async function remuxSources(scanned: SourceFiles[], throwIfCancelled: CancelCheck) {
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
    throwIfCancelled()
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
    throw new NotOnDiskError(
      `No episode files (01.mp4, 02.mp4, …) in ${scanned.map((source) => source.pathname).join(", ")}`
    )
  }

  return tracks
}

/**
 * Upserts one episode per episode number and one track per file, in one transaction.
 *
 * @returns The season's imported episodes, with what the art step needs (including the languages each had
 * before the upsert)
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
    const previousTracks = await tx
      .select({ episodeNo: schema.episodes.episodeNo, language: schema.tracks.language })
      .from(schema.tracks)
      .innerJoin(schema.episodes, eq(schema.tracks.episodeId, schema.episodes.id))
      .where(eq(schema.episodes.seasonId, seasonId))
    const previousByEpisode = groupBy(previousTracks, (track) => track.episodeNo)

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

    return episodes.map((episode) => ({
      ...episode,
      previousLanguages: (previousByEpisode[episode.episodeNo] ?? []).map(
        (track) => track.language
      )
    }))
  })
}

/**
 * Creates each episode's thumbnail and hover-preview sprite sheet from a dubbed track (`isDubbed: true`, the
 * first by language) when the episode has one, otherwise from its original (`artTrack`), one set shared by every
 * language.
 *
 * An existing thumbnail is kept (it may be hand-picked) and an existing sprite whose grid matches the DB is
 * kept; `force` regenerates both. So does a new art track: an episode that already had tracks, but not in the
 * art track's language, has art made from another track (a dub that landed after the original, or one that
 * sorts first by language). The DB is updated per episode, right after its files, so a crash midway leaves it
 * matching what's on disk.
 */
async function generateArt(
  episodes: ImportedEpisode[],
  tracks: TrackFile[],
  directory: string,
  force: boolean,
  throwIfCancelled: CancelCheck
) {
  await fs.promises.mkdir(directory, { recursive: true })

  for (const episode of episodes) {
    throwIfCancelled()
    const artStartedAt = new Date()
    const track = artTrack(tracks.filter((item) => item.episodeNo === episode.episodeNo))
    if (!track) continue

    const stem = fileStem(episode.episodeNo)
    const thumbnail = toStoredPath(path.join(directory, `${stem}.webp`))
    const sprite = toStoredPath(path.join(directory, `${stem}-sprite-sheet.webp`))
    const grid = spriteGrid(track.duration)
    const isNewArtTrack =
      episode.previousLanguages.length > 0 &&
      !episode.previousLanguages.includes(track.language)
    const shouldRemake = force || isNewArtTrack
    const done: string[] = []

    if (shouldRemake || !fs.existsSync(thumbnail)) {
      await writeThumbnail(
        track.path,
        thumbnailTime(track.duration, episode.skips),
        thumbnail
      )
      done.push("thumbnail")
    }

    if (shouldRemake || !fs.existsSync(sprite) || !isEqual(episode.spriteGrid, grid)) {
      await writeSprite(track.path, grid, sprite)
      done.push(`sprite ${grid.count} tiles`)
    }

    await db
      .update(schema.episodes)
      .set({ thumbnail, sprite, spriteGrid: grid })
      .where(eq(schema.episodes.id, episode.id))

    logger(
      `🖼️ E${stem} ${track.language}${isNewArtTrack ? " (new art track)" : ""} ${done.length > 0 ? done.join(", ") : "kept existing art"}`,
      artStartedAt
    )
  }
}

/**
 * Finds the seasons to import: the one `--season` names (whatever its status or kind), otherwise every
 * upcoming or airing season of a `--kind` content, by content title, then release date.
 */
async function findSeasons({ season: seasonId, kind }: ArgsValidator) {
  const rows = await db
    .select({
      id: schema.seasons.id,
      kind: schema.seasons.kind,
      seasonNo: schema.seasons.seasonNo,
      title: schema.seasons.title,
      sources: schema.seasons.sources,
      contentTitle: schema.contents.title,
      sourceDir: schema.contents.sourceDir
    })
    .from(schema.seasons)
    .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
    .where(
      seasonId
        ? eq(schema.seasons.id, seasonId)
        : and(
            eq(schema.contents.kind, kind),
            inArray(schema.seasons.status, ONGOING_STATUSES)
          )
    )
    .orderBy(asc(schema.contents.title), asc(schema.seasons.releasedOn))

  if (seasonId && rows.length === 0) throw new Error(`Season ${seasonId} not found`)

  return rows
}

/**
 * Names the season in the log: its content's title, then its own title or kind and number.
 */
function seasonName(row: SeasonRow) {
  return `${row.contentTitle} ${row.title ?? (row.seasonNo === null ? row.kind : `season ${row.seasonNo}`)}`
}

/**
 * Imports one season: scans its sources, remuxes them if asked, writes its episodes and tracks, then makes their
 * art. Deletes the season's remux backups last, so a failure in any step leaves every original in `.original/`
 * to recover from.
 */
async function importSeason(row: SeasonRow, { remux, force, cancelFile }: ArgsValidator) {
  const startedAt = new Date()
  const name = seasonName(row)
  const throwIfCancelled = cancelCheck(cancelFile)

  const artDirectory = seasonArtDirectory(row.sourceDir, row)
  if (!artDirectory)
    throw new Error(
      `${name} has no source inside ${row.sourceDir} for its art folder (or a season has no season number)`
    )

  const season: Season = {
    id: row.id,
    kind: row.kind,
    name,
    sources: row.sources,
    artDirectory
  }

  const scanned = await scanSources(season)
  if (remux) await remuxSources(scanned, throwIfCancelled)

  const tracks = await readSourceTracks(scanned)
  throwIfCancelled()
  const episodes = await importTracks(season.id, tracks)
  logger(
    `📥 Imported ${episodes.length} episodes and ${tracks.length} tracks for ${name}`
  )

  await generateArt(episodes, tracks, season.artDirectory, force, throwIfCancelled)

  /**
   * Covers the whole season, so backups left by an earlier run that stopped midway go too, now that their files
   * checked out.
   */
  if (remux) {
    const removed = await removeBackups(tracks.map((track) => track.path))
    if (removed > 0) logger(`🧹 Deleted ${removed} original(s) from .original/`)
  }

  logger(`✅ Done with ${name}`, startedAt)
}

/**
 * Imports seasons from the sources listed on them (`seasons.sources`): remuxes their files if asked, writes their
 * episodes and tracks, then creates each episode's thumbnail and sprite sheet.
 *
 * Usage (from the repo root):
 * ```bash
 * bun tests/track.spec.ts
 * bun tests/track.spec.ts --kind tv_series
 * bun tests/track.spec.ts --season 019a2b3c-… --remux --force
 * ```
 *
 * `--season` imports that season, whatever its status. Without it, every `upcoming` or `airing` season of a
 * `--kind` content (`contents.kind`, default `anime_series`) is imported, one after another: a season that fails
 * is logged and the run goes on to the next, and one with no files on disk yet (its primary source folder or
 * its episode files) is skipped. `--kind` is ignored with `--season`.
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
 * primary one (the original, or the first dub without one), which stops the season. A dub with fewer episodes than
 * the original simply gives those episodes one more track.
 *
 * - `--remux` turns files that aren't fragmented MP4 into one (stream copy, fast), re-encodes audio other than
 *   AAC/Opus to AAC, and re-tags HEVC as `hvc1`. Each replaced file is kept in `<folder>/.original/` and deleted
 *   only when the season's whole import has succeeded; if any step fails, it stays there to recover from. Files that
 *   need a video re-encode (Hi10P, MPEG-2, …) stop the season before anything is changed. Without it, files must
 *   already be fragmented MP4.
 * - Art goes to the season's art folder in the content's `sourceDir` (`seasonArtDirectory`, e.g.
 *   `<CONTENTS_SOURCE_DIR>/Frieren/Thumbnails/1/`, `<CONTENTS_SOURCE_DIR>/SAO/Thumbnails/Ordinal Scale/`, or
 *   `<CONTENTS_SOURCE_DIR>/SAO/Thumbnails/Alternative Gun Gale Online/1/` for a spinoff), made from a dub's file
 *   (the original's when the episode has no dub):
 *   `01.webp` (640×360) and `01-sprite-sheet.webp` (192×108 tiles). `--force` regenerates existing art; an
 *   episode whose dub landed after its art was made from the original gets new art without it.
 * - `--cancel-file <path>` is how the control panel's Import runs it: once that file exists, the run stops at
 *   its next safe point (between seasons, remuxed files, and episodes' art) and exits with
 *   `IMPORT_EXIT_CODES.cancelled`. A failed run exits with `IMPORT_EXIT_CODES.failed`.
 *
 * Safe to re-run: episodes upsert on `(seasonId, episodeNo)` and tracks on `(episodeId, language)`.
 */
async function main() {
  const startedAt = new Date()

  const { values } = parseArgs({
    options: {
      "season": { type: "string" },
      "kind": { type: "string" },
      "remux": { type: "boolean" },
      "force": { type: "boolean" },
      "cancel-file": { type: "string" }
    }
  })

  const parsed = argsValidator.safeParse({ ...values, cancelFile: values["cancel-file"] })
  if (!parsed.success) {
    logger(
      `❌ Invalid arguments: ${JSON.stringify(z.flattenError(parsed.error).fieldErrors)}`
    )
    process.exitCode = IMPORT_EXIT_CODES.failed
    return
  }

  const missing = missingTools()
  if (missing.length > 0)
    stop(
      missing.map((tool) => `${tool} is not in the PATH`),
      "Install ffmpeg first"
    )

  const rows = await findSeasons(parsed.data)
  if (rows.length === 0) {
    logger(`⚠️ No upcoming or airing ${parsed.data.kind} seasons to import`)
    return
  }

  logger(`📋 ${rows.length} season(s) to import`)

  const throwIfCancelled = cancelCheck(parsed.data.cancelFile)
  let imported = 0
  let isCancelled = false
  const skipped: string[] = []
  const failed: string[] = []

  for (const row of rows) {
    try {
      throwIfCancelled()
      await importSeason(row, parsed.data)
      imported++
    } catch (error) {
      if (error instanceof CancelledError) {
        isCancelled = true
        logger(`🛑 ${error.message} during ${seasonName(row)}`)
        break
      } else if (error instanceof NotOnDiskError && !parsed.data.season) {
        skipped.push(seasonName(row))
        logger(`⏭️ Skipped ${seasonName(row)}: ${error.message}`)
      } else {
        failed.push(seasonName(row))
        logger(`❌ ${seasonName(row)}: ${errorMessage(error)}`)
      }
    }
  }

  logger(
    `${isCancelled ? "🛑" : "🎉"} Imported ${imported}/${rows.length} season(s)${skipped.length > 0 ? `, skipped ${skipped.length} with no files` : ""}${failed.length > 0 ? `, failed: ${failed.join(", ")}` : ""}${isCancelled ? ", then cancelled" : ""}`,
    startedAt
  )
  if (isCancelled) process.exitCode = IMPORT_EXIT_CODES.cancelled
  else if (failed.length > 0) process.exitCode = IMPORT_EXIT_CODES.failed
  /**
   * The control panel (`--cancel-file`) refreshes the site cache itself once the run ends.
   */
  if (imported > 0 && !parsed.data.cancelFile)
    logger(
      '⚠️ A running server serves cached art paths until `cacheLife("hours")` expires or it restarts'
    )
}

main()
  .catch((error) => {
    logger(`❌ ${errorMessage(error)}`)
    process.exitCode = IMPORT_EXIT_CODES.failed
  })
  .finally(() => db.$client.end())
