import { addDays, isBefore } from "date-fns"
import { cacheLife, cacheTag } from "next/cache"
import { cookies } from "next/headers"
import { NIL, v5 as uuidV5 } from "uuid"
import { z } from "zod"

import { APP_TOKEN, ROLES, TOKEN } from "@/constants"
import { ENV } from "@/constants/env"
import { Cipher } from "@/libs/cipher"

type TokenAccount = { id: string; role: Account.Role }

/**
 * Validates the decrypted `"PREFIX.ROLE.SUB.EXP"` payload split on `.`.
 */
const payloadValidator = z.tuple([
  z.literal(TOKEN.PREFIX),
  z.enum(ROLES),
  z.uuid(),
  z.coerce.number().int().positive()
])

/**
 * Cache tag of one token's decrypted payload. The token is hashed so the tag stays short and doesn't leak it.
 */
export function tokenTag(token: string) {
  return `auth-token/${uuidV5(token, NIL)}`
}

/**
 * Encrypts an auth token for an account.
 *
 * @param account - The account's `id` and `role`
 * @param expiresAt - When the token stops being accepted
 * @returns The encrypted token (hex), stored in the `APP_TOKEN` cookie
 */
export async function generateToken(account: TokenAccount, expiresAt: Date) {
  const payload: AuthToken = `${TOKEN.PREFIX}.${account.role}.${account.id}.${expiresAt.getTime()}`
  return Cipher.encrypt(payload)
}

/**
 * Decrypts a token, cached in Redis because scrypt + AES is deliberately slow.
 *
 * Only this pure step is cached. Anything time-dependent (expiry) is checked by the caller, so a cached result
 * can't outlive the token. Failures throw and are not cached.
 */
async function decryptToken(token: string) {
  "use cache: remote"
  cacheTag(tokenTag(token))
  cacheLife("hours")

  return Cipher.decrypt(token)
}

/**
 * Decrypts and checks an auth token.
 *
 * @param token - The `APP_TOKEN` cookie value
 * @returns The account ID, the role at sign-in time, and the expiry
 * @throws `Error("401 …")` when the token is malformed, tampered with, or expired
 */
export async function validateToken(token: string) {
  let decrypted: string

  try {
    decrypted = await decryptToken(token)
  } catch {
    throw new Error("401 Invalid token")
  }

  const parsed = payloadValidator.safeParse(decrypted.split("."))
  if (!parsed.success) {
    throw new Error("401 Invalid token")
  }

  const [, role, accountId, expiresAtMs] = parsed.data
  const expiresAt = new Date(expiresAtMs)

  if (isBefore(expiresAt, new Date())) {
    throw new Error("401 Token expired")
  }

  return { accountId, role, expiresAt }
}

/**
 * Issues a token for an account and stores it in the `APP_TOKEN` cookie. Call it only from Server Actions.
 *
 * @param account - The account's `id` and `role`
 * @param keepLoggedIn - `true` → 365-day persistent cookie, `false` → 1-day token in a browser-session cookie
 */
export async function startSession(account: TokenAccount, keepLoggedIn = false) {
  const days = keepLoggedIn ? TOKEN.LIFETIME_DAYS.long : TOKEN.LIFETIME_DAYS.short
  const token = await generateToken(account, addDays(new Date(), days))

  const cookieStore = await cookies()
  cookieStore.set(APP_TOKEN, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: ENV.APP_URL.startsWith("https://"),
    path: "/",
    maxAge: keepLoggedIn ? days * 24 * 60 * 60 : undefined
  })
}
