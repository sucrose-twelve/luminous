import { parseArgs } from "util"

import { eq, or } from "drizzle-orm"
import { z } from "zod"

import { ROLES } from "@/constants"
import { db, schema } from "@/drizzle"
import { logger } from "@/libs/logger"
import { hashPassword } from "@/libs/password"
import { slugify } from "@/libs/utils"

const argsValidator = z.object({
  role: z.enum(ROLES).default("user"),
  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/)
    .optional(),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(32)
})

/**
 * Creates an account with its profile and preference. Replaces sign-up: the app is localhost-only, so accounts
 * are created from the terminal.
 *
 * Usage (from the repo root):
 * ```bash
 * bun tests/account.spec.ts --email contact@luminous.co --password p4ssw02d
 * bun tests/account.spec.ts --role admin --username luminous --email admin@luminous.co --password p4ssw02d
 * ```
 *
 * `--username` defaults to the slugified part of the email before `@`. `--role` defaults to `user`.
 */
async function main() {
  const startedAt = new Date()

  const { values } = parseArgs({
    options: {
      role: { type: "string" },
      username: { type: "string" },
      email: { type: "string" },
      password: { type: "string" }
    }
  })

  const parsed = argsValidator.safeParse(values)
  if (!parsed.success) {
    logger(`❌ Invalid arguments: ${JSON.stringify(z.flattenError(parsed.error).fieldErrors)}`)
    return
  }

  const { email, password, role } = parsed.data
  const username = parsed.data.username ?? slugify(email.split("@")[0])

  const [existing] = await db
    .select({ username: schema.accounts.username, email: schema.accounts.email })
    .from(schema.accounts)
    .where(or(eq(schema.accounts.username, username), eq(schema.accounts.email, email)))
    .limit(1)

  if (existing) {
    logger(`❌ An account already uses this username or email (${existing.username} / ${existing.email})`)
    return
  }

  const passwordHash = await hashPassword(password)

  const account = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(schema.accounts)
      .values({ role, username, email, password: passwordHash })
      .returning({ id: schema.accounts.id })

    await tx.insert(schema.profiles).values({ accountId: created.id, displayName: username })
    await tx.insert(schema.preferences).values({ accountId: created.id })

    return created
  })

  logger(`🎉 Created ${role} account "${username}" <${email}> (${account.id})`, startedAt)
}

main()
  .catch((error) => logger(`❌ ${error instanceof Error ? error.message : String(error)}`))
  .finally(() => db.$client.end())
