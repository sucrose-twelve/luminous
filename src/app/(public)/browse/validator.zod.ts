import { z } from "zod"

import {
  AUDIOS,
  KINDS,
  ORDERS,
  PAGE_SIZES,
  SEASON_STATUSES,
  SEASONALS,
  SORTS,
  SOURCES
} from "@/constants"
import { GENRES } from "@/constants/data/genres"

export const browseValidator = z.object({
  page: z.int().min(1).default(1),
  take: z.literal(PAGE_SIZES).default(24),
  kind: z.enum(KINDS).nullish(),
  source: z.enum(SOURCES).nullish(),
  genres: z.array(z.enum(GENRES)).max(10).default([]),
  seasonal: z.enum(SEASONALS).nullish(),
  year: z.int().min(1900).max(2999).nullish(),
  status: z.enum(SEASON_STATUSES).nullish(),
  audio: z.enum(AUDIOS).nullish(),
  search: z.string().trim().max(100).nullish(),
  sort: z.enum(SORTS).nullish(),
  order: z.enum(ORDERS).default("desc")
})

export type BrowseValidator = z.infer<typeof browseValidator>
