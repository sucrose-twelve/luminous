"use server"

import { eq } from "drizzle-orm"

import { withRole } from "@/actions/auth"
import { KIND_FULL_LABELS, ROOT_ROLES } from "@/constants"
import { db, schema } from "@/drizzle"
import { seasonName } from "@/libs/season"

import { ongoingSeasonIds } from "./read"
import { startImportJob } from "./runner"
import { importValidator } from "./validator.zod"

/**
 * Starts `tests/track.spec.ts` from the control panel (`startImportJob`): for one season, or for every ongoing
 * season of a content kind. Root only: `--remux` rewrites source files and `--force` replaces hand-picked
 * thumbnails. One import runs at a time.
 *
 * @returns The new job, or a `message` (no such season, nothing ongoing, or another import still running)
 */
export const startImport = withRole(ROOT_ROLES, async (account, input: unknown) => {
  const parsed = importValidator.safeParse(input)
  if (!parsed.success) return { ok: false as const, message: "Invalid import" }

  const { target, flags } = parsed.data
  const startedBy = account.profile.displayName

  if (target.type === "season") {
    const [row] = await db
      .select({
        id: schema.seasons.id,
        kind: schema.seasons.kind,
        seasonNo: schema.seasons.seasonNo,
        title: schema.seasons.title,
        contentTitle: schema.contents.title
      })
      .from(schema.seasons)
      .innerJoin(schema.contents, eq(schema.seasons.contentId, schema.contents.id))
      .where(eq(schema.seasons.id, target.seasonId))
      .limit(1)
    if (!row) return { ok: false as const, message: "Season not found" }

    return startImportJob({
      target: {
        type: "season",
        seasonId: row.id,
        name: `${row.contentTitle} ${seasonName(row)}`
      },
      flags,
      seasonIds: [row.id],
      startedBy
    })
  }

  const seasons = await ongoingSeasonIds(target.kind)
  const label = KIND_FULL_LABELS[target.kind]
  if (seasons.length === 0) {
    return { ok: false as const, message: `No upcoming or airing ${label} seasons` }
  }

  return startImportJob({
    target: { type: "ongoing", kind: target.kind, name: `Ongoing ${label}` },
    flags,
    seasonIds: seasons.map((season) => season.id),
    startedBy
  })
})
