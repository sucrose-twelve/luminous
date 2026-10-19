"use server"

import { eq } from "drizzle-orm"
import { pick } from "es-toolkit"
import { z } from "zod"

import { db, schema } from "@/drizzle"
import { accountColumns } from "@/drizzle/table-columns"
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/libs/password"

import { startSession } from "../token"
import { formValidator, type FormValidator } from "./validator.zod"

/**
 * Signs in with a username or email + password and sets the auth cookie.
 *
 * Called from the sign-in modal (there is no `/sign-in` page). On success it returns `{ ok: true }`; setting
 * the cookie in a Server Action re-renders the current route, so the modal just closes and the page updates.
 *
 * Expected failures are returned, not thrown. An unknown account and a wrong password return the same message
 * and take the same time, so the modal doesn't reveal which usernames or emails exist.
 */
export async function signIn(input: FormValidator) {
  const parsed = formValidator.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
  }

  const { identifier, password, keepLoggedIn } = parsed.data

  const where = identifier.includes("@")
    ? eq(schema.accounts.email, identifier.toLowerCase())
    : eq(schema.accounts.username, identifier)

  const [account] = await db
    .select(pick(accountColumns, ["id", "role", "password", "isActive", "isSuspended"]))
    .from(schema.accounts)
    .where(where)
    .limit(1)

  const isPasswordValid = await verifyPassword(
    password,
    account?.password ?? DUMMY_PASSWORD_HASH
  )
  if (!account || !isPasswordValid) {
    return { ok: false as const, message: "Invalid username, email, or password" }
  }

  if (account.isSuspended || !account.isActive) {
    return { ok: false as const, message: "Your account has been suspended" }
  }

  await startSession(account, keepLoggedIn)
  return { ok: true as const }
}
