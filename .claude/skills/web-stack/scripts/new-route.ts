/**
 * Scaffolds a route folder that follows the `/browse` layout.
 *
 * Usage (from the repo root):
 * ```bash
 * bun .claude/skills/web-stack/scripts/new-route.ts <public|protected> <segment>
 * bun .claude/skills/web-stack/scripts/new-route.ts public contents/[slug]
 * bun .claude/skills/web-stack/scripts/new-route.ts protected my-list
 * ```
 *
 * Existing files are never overwritten.
 */
import fs from "node:fs"
import path from "node:path"

const [group, segment] = process.argv.slice(2)

if (!group || !segment || !["public", "protected"].includes(group)) {
  console.error("Usage: bun new-route.ts <public|protected> <segment>   e.g. public contents/[slug]")
  process.exit(1)
}

const appDir = path.resolve("src/app")
if (!fs.existsSync(appDir)) {
  console.error("Run this from the repo root (src/app not found).")
  process.exit(1)
}

const parts = segment.split("/").filter(Boolean)
const dynamicParams = parts.filter((part) => /^\[.+\]$/.test(part)).map((part) => part.slice(1, -1))
const staticParts = parts.filter((part) => !/^\[.+\]$/.test(part))
const baseName = staticParts.at(-1) ?? "Page"
const componentName = baseName
  .split("-")
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join("")
const title = baseName
  .split("-")
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(" ")

const routeDir = path.join(appDir, `(${group})`, ...parts)

const propsType =
  dynamicParams.length > 0
    ? `NextParams<{ ${dynamicParams.map((param) => `${param}: string`).join("; ")} }>`
    : "NextSearchParams"
const propsName = dynamicParams.length > 0 ? "params" : "searchParams"

const files: Record<string, string> = {
  "page.tsx": `import type { Metadata } from "next"

export const metadata: Metadata = { title: "${title}" }

export default async function ${componentName}({ ${propsName} }: ${propsType}) {
  return <section className='mx-auto max-w-8xl px-4'></section>
}
`,
  "actions/read.ts": `"use server"
`,
  "utils.ts": "",
  "validator.nuqs.ts": `import { createSearchParamsCache, parseAsInteger } from "nuqs/server"

export const queryValidator = createSearchParamsCache({
  page: parseAsInteger.withDefault(1)
})

export type QueryValidator = Awaited<ReturnType<typeof queryValidator.parse>>
`,
  "validator.zod.ts": `import { z } from "zod"

export const formValidator = z.object({})

export type FormValidator = z.infer<typeof formValidator>
`
}

fs.mkdirSync(path.join(routeDir, "components"), { recursive: true })

for (const [relativePath, content] of Object.entries(files)) {
  const filePath = path.join(routeDir, relativePath)
  const displayPath = path.relative(process.cwd(), filePath)

  if (fs.existsSync(filePath)) {
    console.log(`skip    ${displayPath}`)
    continue
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  console.log(`create  ${displayPath}`)
}

console.log(`\nDone. Delete the files this route doesn't need (e.g. validator.zod.ts if it has no form).`)
