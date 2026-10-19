import crypto from "crypto"
import { promisify } from "util"

const scrypt = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keyLength: number
) => Promise<Buffer>

const SALT_LENGTH = 16
const KEY_LENGTH = 64

/**
 * A well-formed hash that matches no password.
 *
 * Verified against when the username doesn't exist, so a failed sign-in takes the same time either way and
 * doesn't reveal which usernames exist.
 */
export const DUMMY_PASSWORD_HASH = `${"0".repeat(SALT_LENGTH * 2)}:${"0".repeat(KEY_LENGTH * 2)}`

/**
 * Hashes a password with scrypt and a random salt. Passwords are hashed, never encrypted with `Cipher`.
 *
 * @param password - The plain password
 * @returns `"<saltHex>:<hashHex>"`, stored in `accounts.password`
 *
 * @example
 * ```ts
 * const stored = await hashPassword("correct horse battery staple")
 * ```
 */
export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const hash = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH)
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

/**
 * Checks a password against a hash from `hashPassword`, in constant time.
 *
 * @param password - The plain password to check
 * @param stored - The stored `"<saltHex>:<hashHex>"` value
 * @returns `true` when the password matches
 */
export async function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":")
  if (!saltHex || !hashHex) return false

  const expected = Buffer.from(hashHex, "hex")
  const actual = await scrypt(
    password.normalize("NFKC"),
    Buffer.from(saltHex, "hex"),
    expected.length
  )

  return expected.length > 0 && crypto.timingSafeEqual(expected, actual)
}
