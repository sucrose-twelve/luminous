import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { DATABASE_URL } from "@/constants/env"

import { relations, schema } from "./relations"

/**
 * `pg_trgm.word_similarity_threshold` is lowered from 0.6 so search forgives a typo or two: "freiren" scores
 * 0.5 against "Frieren". Set per connection (not as `similarity() > x`) so the `<%` operator still uses the
 * trigram indexes.
 */
const queryClient = postgres(DATABASE_URL, {
  idle_timeout: 30,
  connection: { "pg_trgm.word_similarity_threshold": 0.4 }
})

export const db = drizzle({
  client: queryClient,
  relations,
  logger: false
})

export { schema }
