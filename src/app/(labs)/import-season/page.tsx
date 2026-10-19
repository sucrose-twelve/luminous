import type { Metadata } from "next"
import { connection } from "next/server"

import { readContentOptions } from "@/actions/contents/read"

import { SeasonForm } from "./form"

export const metadata: Metadata = { title: "Import season" }

export default async function ImportSeason() {
  /**
   * Render per request: a lab page shouldn't make `bun run build` depend on a reachable database.
   */
  await connection()
  const contents = await readContentOptions()

  return (
    <>
      <h1>Import season</h1>
      <SeasonForm contents={contents} />
    </>
  )
}
