import { setTimeout } from "timers/promises"

import { db, schema } from "@/drizzle"
import { logger } from "@/libs/logger"
import { hashPassword } from "@/libs/password"

import { accountsData } from "./data/accounts"

async function main() {
  const startedAt = new Date()
  logger("🚀 Database seeding started.")

  logger("📝 Accounts data seeding...")
  for await (const account of accountsData) {
    const { profile, preferences, password, ...accountValues } = account
    const passwordHash = await hashPassword(password)

    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.accounts)
        .values({ ...accountValues, password: passwordHash })
        .returning({ id: schema.accounts.id })

      await tx.insert(schema.profiles).values({ ...profile, accountId: created.id })
      await tx
        .insert(schema.preferences)
        .values({ ...preferences, accountId: created.id })

      return created
    })

    await setTimeout(200)
  }
  logger(`✅ Accounts data has been successfully created.`)

  logger("🎉 Database seeding has been successfully completed.", startedAt)

  process.exit(0)
}

main()
