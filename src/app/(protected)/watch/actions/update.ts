"use server"

import { sql } from "drizzle-orm"
import { refresh, updateTag } from "next/cache"
import { z } from "zod"

import { withAuth } from "@/actions/auth"
import { db, schema } from "@/drizzle"

import { preferenceValidator } from "../validator.zod"

/**
 * Saves the account's playback preferences (audio language, Autoplay Next, Auto Skip) from the player.
 *
 * Upserts, because an older account may have no `preferences` row yet. Refreshes the page so the player's
 * optimistic value settles on what was saved.
 *
 * @param input - Validated with `preferenceValidator`
 * @returns `{ ok: true }`, or `{ ok: false, errors }` for invalid input
 */
export const updatePlaybackPreference = withAuth(async (account, input: unknown) => {
  const parsed = preferenceValidator.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
  }

  await db
    .insert(schema.preferences)
    .values({ accountId: account.id, ...parsed.data })
    .onConflictDoUpdate({
      target: schema.preferences.accountId,
      set: { ...parsed.data, updatedAt: sql`now()` }
    })

  /**
   * The cached account carries its preference row.
   */
  updateTag(`auth-account/${account.id}`)
  refresh()
  return { ok: true as const }
})
