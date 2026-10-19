import { asc } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { db, schema } from "@/drizzle"
import { contentColumns } from "@/drizzle/table-columns"

/**
 * Lists every content as `{ id, title }`, sorted by title, for pickers such as the import-season form.
 */
export async function readContentOptions() {
  "use cache"
  cacheTag("contents/list")
  cacheLife("hours")

  return db
    .select({ id: contentColumns.id, title: contentColumns.title })
    .from(schema.contents)
    .orderBy(asc(schema.contents.title))
}
