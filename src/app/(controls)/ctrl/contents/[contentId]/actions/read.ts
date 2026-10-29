import { eq } from "drizzle-orm"
import { omit } from "es-toolkit"

import { withRole } from "@/actions/auth"
import { STAFF_ROLES } from "@/constants"
import { db, schema } from "@/drizzle"
import { contentColumns } from "@/drizzle/table-columns"

/**
 * Picked outside the `withRole` callback: inline, TypeScript infers `omit`'s keys from the callback's generic
 * return type and types the row as the whole table.
 */
const contentFields = omit(contentColumns, ["searchText"])

/**
 * Loads a content for its control panel page, source directory included. Not cached: staff must see their own
 * edits at once.
 *
 * @param contentId - `contents.id`, already validated as a UUID
 * @returns The content, or `null` when no content has that ID
 */
export const readControlContent = withRole(
  STAFF_ROLES,
  async (_account, contentId: string) => {
    const [content] = await db
      .select(contentFields)
      .from(schema.contents)
      .where(eq(schema.contents.id, contentId))
      .limit(1)

    return content ?? null
  }
)

export type ControlContent = NonNullable<Awaited<ReturnType<typeof readControlContent>>>
