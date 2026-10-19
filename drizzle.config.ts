import { defineConfig } from "drizzle-kit"

import { DATABASE_URL } from "@/constants/env"

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/drizzle/schema/*.schema.ts",
  out: "./src/drizzle/migrations",
  dbCredentials: {
    url: DATABASE_URL
  },
  introspect: {
    casing: "camel"
  }
})
