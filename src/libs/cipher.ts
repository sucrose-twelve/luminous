import crypto from "crypto"
import { promisify } from "util"

import { CIPHER, type CipherSchema } from "@/constants/env"

const scrypt = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keyLength: number
) => Promise<Buffer>

const TAG_LENGTH = 16

/**
 * AES key size in bytes for each algorithm. A key of the wrong size makes `createCipheriv` throw.
 */
const KEY_LENGTH = {
  "aes-128-gcm": 16,
  "aes-192-gcm": 24,
  "aes-256-gcm": 32
} as const satisfies Record<CipherSchema["algorithm"], number>

/**
 * Derives the AES key from the secret and a per-message salt.
 *
 * Uses the async `scrypt` so key derivation (the deliberately slow part) doesn't block the event loop.
 */
function deriveKey(secretKey: string, salt: Buffer) {
  return scrypt(Buffer.from(secretKey, "utf-8"), salt, KEY_LENGTH[CIPHER.algorithm])
}

export class Cipher {
  /**
   * 🔐 Encrypts a plain text string with AES-GCM.
   *
   * @param plainText - The string to be encrypted
   * @param secretKey - The secret key used for encryption, defaults to `CIPHER_SECRET`
   * @returns A hexadecimal string of `salt | iv | authTag | ciphertext`
   *
   * @example
   * ```typescript
   * const encryptedHex = await Cipher.encrypt("Hello, World!")
   * console.log(encryptedHex) // "a1b2c3d4e5f6..."
   * ```
   */
  static async encrypt(plainText: string, secretKey: string = CIPHER.secret) {
    const SALT = crypto.randomBytes(CIPHER.salt)
    const IV = crypto.randomBytes(CIPHER.iv)
    const KEY = await deriveKey(secretKey, SALT)

    const cipher = crypto.createCipheriv(CIPHER.algorithm, KEY, IV, {
      authTagLength: TAG_LENGTH
    })
    const encrypted = Buffer.concat([cipher.update(plainText, "utf-8"), cipher.final()])
    const TAG = cipher.getAuthTag()

    return Buffer.concat([SALT, IV, TAG, encrypted]).toString("hex")
  }

  /**
   * 🔓 Decrypts a string produced by `Cipher.encrypt`.
   *
   * Throws when the input isn't valid hex, is too short, or fails the GCM auth tag check (tampered data or a
   * different secret). Callers should treat any throw as "invalid".
   *
   * @param encryptedHex - The hexadecimal string of `salt | iv | authTag | ciphertext`
   * @param secretKey - The secret key used for decryption, defaults to `CIPHER_SECRET`
   * @returns The decrypted string in UTF-8 format
   *
   * @example
   * ```typescript
   * const plainText = await Cipher.decrypt(encryptedHex)
   * console.log(plainText) // "Hello, World!"
   * ```
   */
  static async decrypt(encryptedHex: string, secretKey: string = CIPHER.secret) {
    const headerLength = CIPHER.salt + CIPHER.iv + TAG_LENGTH
    if (
      !/^(?:[0-9a-f]{2})+$/i.test(encryptedHex) ||
      encryptedHex.length / 2 <= headerLength
    ) {
      throw new Error("Invalid cipher text")
    }

    const data = Buffer.from(encryptedHex, "hex")

    const SALT = data.subarray(0, CIPHER.salt)
    const IV = data.subarray(CIPHER.salt, CIPHER.salt + CIPHER.iv)
    const TAG = data.subarray(CIPHER.salt + CIPHER.iv, headerLength)
    const ENCRYPTED = data.subarray(headerLength)

    const KEY = await deriveKey(secretKey, SALT)
    const decipher = crypto
      .createDecipheriv(CIPHER.algorithm, KEY, IV, { authTagLength: TAG_LENGTH })
      .setAuthTag(TAG)

    return Buffer.concat([decipher.update(ENCRYPTED), decipher.final()]).toString("utf-8")
  }
}
