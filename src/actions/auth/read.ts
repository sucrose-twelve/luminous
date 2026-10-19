import { eq } from "drizzle-orm"
import { omit } from "es-toolkit"
import { cacheLife, cacheTag } from "next/cache"
import { connection } from "next/server"

import { db, schema } from "@/drizzle"
import {
  accountColumns,
  preferenceColumns,
  profileColumns
} from "@/drizzle/table-columns"

import { validateToken } from "../token"

/**
 * Loads an account (without its password hash) together with its profile and preference, cached per account.
 *
 * `profile` / `preference` are `null` if the row is missing. Anything that changes an account, its profile, or
 * its preference must call `updateTag(\`auth-account/${id}\`)` so the next request sees it.
 */
export async function readAuthAccount(accountId: string) {
  "use cache"
  cacheTag(`auth-account/${accountId}`)
  cacheLife("hours")

  const [row] = await db
    .select({
      ...omit(accountColumns, ["password"]),
      profile: omit(profileColumns, ["accountId"]),
      preference: omit(preferenceColumns, ["accountId"])
    })
    .from(schema.accounts)
    .innerJoin(schema.profiles, eq(schema.profiles.accountId, schema.accounts.id))
    .innerJoin(schema.preferences, eq(schema.preferences.accountId, schema.accounts.id))
    .where(eq(schema.accounts.id, accountId))
    .limit(1)

  return row ?? null
}

export type AuthAccount = NonNullable<Awaited<ReturnType<typeof readAuthAccount>>>

type SessionResult = { ok: true; account: AuthAccount } | { ok: false; error: string }

/**
 * Resolves the signed-in account from an `APP_TOKEN` cookie value.
 *
 * Shared by `withAuth` (Server Actions, server readers) and `withGuard` (Route Handlers), so both
 * apply the same checks. The DB account is the source of truth for `role` and status; the role inside the
 * token is only what it was at sign-in.
 *
 * @param token - The cookie value, if any
 * @returns The account, or an `"<status> <message>"` error for `ErrorBoundary`
 */
export async function resolveSession(token: string | undefined): Promise<SessionResult> {
  /**
   * A session is request-time data: the token expiry is checked against the clock, and a failure logs and
   * redirects with a timestamp. Partial Prefetching prerenders pages that read the session (`/watch`), and
   * Cache Components rejects the clock there, so stop the prerender here, before any `try` could turn the
   * interruption into a failed sign-in.
   */
  await connection()

  if (!token) {
    return { ok: false, error: "401 Unauthorized" }
  }

  let accountId: string

  try {
    accountId = (await validateToken(token)).accountId
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "401 Unauthorized"
    }
  }

  const account = await readAuthAccount(accountId)
  if (!account) {
    return { ok: false, error: "401 Unauthorized" }
  }

  if (account.isSuspended) {
    return { ok: false, error: "423 Your account has been permanently suspended" }
  }

  if (!account.isActive) {
    return { ok: false, error: "423 Your account has been temporarily suspended" }
  }

  return { ok: true, account }
}
