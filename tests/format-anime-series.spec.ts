import fs from "fs"

import { z } from "zod"

import { Locales } from "@/constants/enum"
import type { ContentInsertValues, SeasonInsertValues } from "@/drizzle/types"
import { logger } from "@/libs/logger"
import { slugify } from "@/libs/utils"

import { errorMessage, toStoredPath } from "./tracks/utils"

const INPUT = "docs/anime_series.json"
const OUTPUT = "docs/new_anime_series.json"

const DUB_FOLDER = "Thai Dub"
const RELEASED_ON = "2026-10-10"

/**
 * `Kakkou no Iinazuke Season 2` duplicates season 2 of `Kakkou no Iinazuke`.
 */
const SKIPPED_TITLES = new Set(["Kakkou no Iinazuke Season 2"])

const SEASON_FOLDER = /^(\d+)(?: - (.+))?$/
const DUB_SEASON_FOLDER = new RegExp(`^${DUB_FOLDER}/((\\d+)(?: - .+)?)$`)
const POSTER_FILE = /^poster(?:-\[(\d+)\])?\.(?:jpg|webp)$/

const inputValidator = z.record(z.string(), z.array(z.string()))

type FormattedSeason = Omit<SeasonInsertValues, "contentId">

/**
 * `source` stays empty until each content is filled in by hand, and `""` is not a `Content.Source`.
 */
type FormattedContent = Omit<ContentInsertValues, "source"> & {
  source: Content.Source | ""
  seasons: FormattedSeason[]
}

/**
 * The entries of a content folder, relative to it. A subfolder that isn't a season, a dub, or a poster is a
 * spinoff (`Sword Art Online/Alternative Gun Gale Online`) and gets a group of its own, named after it.
 */
type Group = { name: string | null; directory: string; entries: string[] }

function groupEntries(directory: string, entries: string[]) {
  const main: Group = { name: null, directory, entries: [] }
  const spinoffs = new Map<string, Group>()

  for (const entry of entries) {
    const [first, ...rest] = entry.split("/")

    if (first === DUB_FOLDER || SEASON_FOLDER.test(first) || POSTER_FILE.test(first)) {
      main.entries.push(entry)
      continue
    }

    const spinoff = spinoffs.get(first) ?? {
      name: first,
      directory: `${directory}/${first}`,
      entries: []
    }
    spinoff.entries.push(rest.join("/"))
    spinoffs.set(first, spinoff)
  }

  return [main, ...spinoffs.values()]
}

function seasonTitle(group: Group, seasonNo: number, name: string | undefined) {
  const label = name ? `Season ${seasonNo} - ${name}` : `Season ${seasonNo}`
  return group.name ? `${group.name} - ${label}` : label
}

/**
 * Builds a group's seasons from its `<N>` and `<N> - <name>` folders, their `Thai Dub/…` twins, and their
 * `poster-[N]` files. A season with only a dub has no original: its `Thai Dub/…` folder stays dubbed.
 */
function formatSeasons(group: Group, warnings: string[]) {
  const originals = new Map<number, { folder: string; name?: string }>()
  const dubs = new Map<number, string>()
  const posters = new Map<number, string>()

  for (const entry of group.entries) {
    const season = entry.match(SEASON_FOLDER)
    const dub = entry.match(DUB_SEASON_FOLDER)
    const poster = entry.match(POSTER_FILE)

    if (season) {
      originals.set(Number(season[1]), { folder: entry, name: season[2] })
    } else if (dub) {
      dubs.set(Number(dub[2]), entry)
    } else if (poster) {
      const seasonNo = Number(poster[1] ?? 1)
      if (!posters.has(seasonNo)) posters.set(seasonNo, entry)
    } else if (entry !== DUB_FOLDER) {
      warnings.push(`Unrecognized entry: ${group.directory}/${entry}`)
    }
  }

  const seasonNos = [...new Set([...originals.keys(), ...dubs.keys()])].sort(
    (a, b) => a - b
  )

  return seasonNos.map((seasonNo): FormattedSeason => {
    const original = originals.get(seasonNo)
    const dub = dubs.get(seasonNo)
    const sources: Content.SeasonSource[] = []

    if (original) {
      sources.push({
        isDubbed: false,
        language: Locales.JP,
        pathname: `${group.directory}/${original.folder}`
      })
    } else {
      warnings.push(`Season ${seasonNo} has no original, only its ${DUB_FOLDER}`)
    }

    if (dub) {
      sources.push({
        isDubbed: true,
        language: Locales.TH,
        pathname: `${group.directory}/${dub}`
      })
    }

    let poster = posters.get(seasonNo)
    if (!poster) {
      poster = `poster-[${seasonNo}].jpg`
      warnings.push(`Season ${seasonNo} has no poster, ${poster} is expected`)
    }

    return {
      kind: group.name ? "spinoff" : "season",
      seasonNo,
      title: seasonTitle(group, seasonNo, original?.name),
      status: "finished",
      sources,
      poster: `${group.directory}/${poster}`,
      releasedOn: RELEASED_ON
    }
  })
}

function formatContent(
  title: string,
  paths: string[],
  warnings: string[]
): FormattedContent {
  const stored = paths.map(toStoredPath)
  const marker = `/${title}/`
  const directory = stored[0].slice(0, stored[0].indexOf(marker) + marker.length - 1)
  const entries = stored.map((entry) => entry.slice(directory.length + 1))

  return {
    slug: slugify(title),
    kind: "anime_series",
    title,
    altTitles: { JP: "", TH: "", EN: "" },
    source: "",
    genres: [],
    sourceDir: stored[0].split("/").slice(0, 3).join("/"),
    seasons: groupEntries(directory, entries).flatMap((group) =>
      formatSeasons(group, warnings)
    )
  }
}

/**
 * Turns the folder listing in `docs/anime_series.json` (`{ [title]: absolutePaths[] }`) into content seeds shaped
 * like `src/drizzle/seeds/data/contents.ts`, and writes them to `docs/new_anime_series.json`. `altTitles`,
 * `source`, `genres`, and `releasedOn` are placeholders to fill in by hand.
 *
 * Usage (from the repo root):
 * ```bash
 * bun tests/format-anime-series.spec.ts
 * ```
 */
function main() {
  const startedAt = new Date()
  const input = inputValidator.parse(JSON.parse(fs.readFileSync(INPUT, "utf8")))

  const contents: FormattedContent[] = []
  const slugs = new Map<string, string>()

  for (const [title, paths] of Object.entries(input)) {
    if (SKIPPED_TITLES.has(title)) {
      logger(`⏭️ Skipped ${title}`)
      continue
    }

    const warnings: string[] = []
    const content = formatContent(title, paths, warnings)

    const duplicate = slugs.get(content.slug)
    if (duplicate) warnings.push(`Slug "${content.slug}" is already used by ${duplicate}`)
    slugs.set(content.slug, title)

    warnings.forEach((warning) => logger(`⚠️ ${title}: ${warning}`))
    contents.push(content)
  }

  fs.writeFileSync(OUTPUT, `${JSON.stringify(contents, null, 2)}\n`)

  const seasonCount = contents.reduce(
    (count, content) => count + content.seasons.length,
    0
  )
  logger(
    `🎉 Wrote ${contents.length} contents (${seasonCount} seasons) to ${OUTPUT}`,
    startedAt
  )
}

try {
  main()
} catch (error) {
  logger(`❌ ${errorMessage(error)}`)
}
