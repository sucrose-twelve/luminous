"use server"

import { and, eq } from "drizzle-orm"
import { refresh } from "next/cache"
import { z } from "zod"

import { withAuth } from "@/actions/auth"
import { db, schema } from "@/drizzle"

import { deleteValidator } from "../validator.zod"

/**
 * Removes one content from the signed-in account's watch history, and with it the saved progress: the watch
 * page starts that content from `0` again, and the next beacon writes a new row.
 *
 * The row must belong to the account, so a guessed ID removes nothing. Nothing that reads `watch_histories` is
 * cached, so there is no tag to expire; `refresh()` re-renders the page without the row.
 *
 * @param input - `{ id }`, validated with `deleteValidator`
 * @returns `{ ok: true }`, or `{ ok: false, errors }` for invalid input or a row the account doesn't have
 */
export const deleteWatchHistory = withAuth(async (account, input: unknown) => {
  const parsed = deleteValidator.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
  }

  const [row] = await db
    .delete(schema.watchHistories)
    .where(
      and(
        eq(schema.watchHistories.id, parsed.data.id),
        eq(schema.watchHistories.accountId, account.id)
      )
    )
    .returning({ id: schema.watchHistories.id })

  if (!row) {
    return {
      ok: false as const,
      errors: { id: ["This title is no longer in your history"] }
    }
  }

  refresh()
  return { ok: true as const }
})
