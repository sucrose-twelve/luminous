import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { setTimeout } from "node:timers/promises"

import { count, eq, notInArray } from "drizzle-orm"
import { omit } from "es-toolkit"
import { NIL, v7 as uuidV7 } from "uuid"

import { db, schema } from "@/drizzle"
import {
  contentColumns,
  episodeColumns,
  seasonColumns,
  trackColumns
} from "@/drizzle/table-columns"
import type { ContentInsertValues, SeasonInsertValues } from "@/drizzle/types"
import { logger } from "@/libs/logger"
import { slugify } from "@/libs/utils"

import contents from "../docs/contents.json"
import seasons from "../docs/seasons.json"

async function main() {
  const startedAt = new Date()

  logger("🎉 Done.", startedAt)
  process.exit(0)
}

// main().catch((error) => logger(`❌ ${error}`))

async function sub() {
  const startedAt = new Date()

  for await (const content of contents) {
    const slug = slugify(content.title)
    const result = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.contents)
        .values({ ...omit(content, ["seasons"]), slug } as ContentInsertValues)
        .onConflictDoNothing()
        .returning({ id: schema.contents.id, slug: schema.contents.slug })

      await tx.insert(schema.seasons).values(
        content.seasons.map((season: any) => ({
          ...season,
          contentId: created.id
        })) as SeasonInsertValues[]
      )

      return created
    })

    if (result) {
      logger(`✅ A content "${content.title}" has been successfully imported.`)
    } else {
      logger(`❌ A content with slug "${slug}" already exists`)
    }
  }

  await db
    .insert(schema.seasons)
    .values(seasons as SeasonInsertValues[])
    .onConflictDoNothing()

  logger("🎉 Succeed", startedAt)
  process.exit(0)
}

// sub().catch((error) => logger(`❌ ${error}`))
