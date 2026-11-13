"use server"

import { z } from "zod"

import { withRole } from "@/actions/auth"
import { expireSeasonCaches } from "@/actions/contents/cache"
import { STAFF_ROLES } from "@/constants"

/**
 * Expires every cached read of a season, its episodes, and their tracks (`expireSeasonCaches`), for an import
 * run from a terminal. Staff only.
 *
 * @param seasonId - `seasons.id`
 * @returns How many episodes and tracks were refreshed, or a `message` when there's no such season
 */
export const refreshSeasonCache = withRole(
  STAFF_ROLES,
  async (_account, seasonId: unknown) => {
    const id = z.uuid().safeParse(seasonId)
    if (!id.success) return { ok: false as const, message: "Season not found" }

    const { seasons, episodes, tracks } = await expireSeasonCaches([id.data])
    if (seasons === 0) return { ok: false as const, message: "Season not found" }

    return { ok: true as const, episodes, tracks }
  }
)
