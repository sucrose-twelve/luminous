import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { setTimeout } from "node:timers/promises"

import { count, eq } from "drizzle-orm"
import { NIL, v7 as uuidV7 } from "uuid"

import { db, schema } from "@/drizzle"
import { contentColumns, seasonColumns } from "@/drizzle/table-columns"
import { logger } from "@/libs/logger"

async function main() {
  const startedAt = new Date()

  // TODO:

  logger("🎉 Done.", startedAt)
  process.exit(0)
}

main()

async function sub() {
  const startedAt = new Date()
  const raw = await db
    .select()
    .from(schema.seasons)
    .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))

  const r: any[] = []

  for await (const { contents, seasons } of raw) {
    for await (const source of seasons.sources) {
      // logger(`📄 ${contents.title}: S${seasons.seasonNo}`)

      if (source.pathname.endsWith(".mp4")) continue

      const pathname = path.resolve(source.pathname)
      const dirents = await fs.promises.readdir(pathname, { withFileTypes: true })
      const files = dirents.filter((dirent) => dirent.isFile())

      if (files.length < 1) {
        r.push({
          seasonId: seasons.id,
          pathname,
          msg: "No episode files"
        })

        continue
      }

      const [tracks] = await db
        .select({ count: count() })
        .from(schema.tracks)
        .leftJoin(schema.episodes, eq(schema.tracks.episodeId, schema.episodes.id))
        .where(eq(schema.episodes.seasonId, seasons.id))

      if (tracks.count < files.length) {
        r.push({
          seasonId: seasons.id,
          pathname,
          msg: `Not Equal: tracks(${tracks.count}), disk(${files.length})`
        })

        continue
      }

      for (const dirent of dirents) {
        if (dirent.isDirectory() && dirent.name.endsWith(".original")) {
          const directory = path.join(dirent.parentPath, dirent.name)
          await fs.promises.rm(directory, { recursive: true, force: true })
          logger(`🧹 Deleted ${directory}`)
          break
        }
      }

      await setTimeout(100)
    }
  }

  await fs.promises.writeFile("docs/warn.json", JSON.stringify(r), { encoding: "utf-8" })

  logger("🎉 Done.", startedAt)
  process.exit(0)
}

// sub()
