import { and, count, eq, inArray } from "drizzle-orm"

import { withRole } from "@/actions/auth"
import { KINDS, ONGOING_STATUSES, ROOT_ROLES } from "@/constants"
import { db, schema } from "@/drizzle"

import { currentImport } from "./runner"

/**
 * The current or last import, for the status card's first render (`/api/imports` streams it from there). Root
 * only, like the import itself. Not cached: it lives in memory and changes by the second.
 */
export const readImportJob = withRole(ROOT_ROLES, async () => currentImport())

/**
 * The seasons `tests/track.spec.ts` imports for a content kind when it's given no season: the ongoing ones, the
 * same filter the script uses.
 */
export function ongoingSeasonIds(kind: Content.Kind) {
  return db
    .select({ id: schema.seasons.id })
    .from(schema.seasons)
    .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
    .where(
      and(
        eq(schema.contents.kind, kind),
        inArray(schema.seasons.status, ONGOING_STATUSES)
      )
    )
}

/**
 * How many ongoing seasons each content kind has, in `KINDS` order, for the Import ongoing modal. Kinds without
 * any are left out. Root only.
 */
export const readOngoingCounts = withRole(ROOT_ROLES, async () => {
  const rows = await db
    .select({ kind: schema.contents.kind, seasons: count() })
    .from(schema.seasons)
    .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
    .where(inArray(schema.seasons.status, ONGOING_STATUSES))
    .groupBy(schema.contents.kind)

  return rows.toSorted((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind))
})
