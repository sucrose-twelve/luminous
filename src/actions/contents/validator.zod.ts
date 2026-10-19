import { z } from "zod"

import { KINDS, SEASON_KINDS, SEASON_STATUSES, SOURCES } from "@/constants"
import { GENRES } from "@/constants/data/genres"
import { Locales } from "@/constants/enum"

/**
 * A full absolute path typed or pasted into an import form, e.g. `<CONTENTS_SOURCE_DIR>\\Big Buck Bunny` or
 * `"<CONTENTS_SOURCE_DIR>\Big Buck Bunny"` (Windows "Copy as path"). Stored the way the DB keeps every media
 * path: forward slashes, no repeated or trailing slash, e.g. `<CONTENTS_SOURCE_DIR>/Big Buck Bunny`.
 */
const mediaPath = z
  .string()
  .trim()
  .nonempty()
  .transform((value) =>
    value
      .replace(/^"(.*)"$/, "$1")
      .replaceAll("\\", "/")
      .replace(/\/{2,}/g, "/")
      .replace(/(?<!^[A-Za-z]:)\/$/, "")
  )

/**
 * An optional text input: an empty field counts as not given.
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

/**
 * Import-content form. `slug` falls back to `slugify(title)` in `createContent` when left empty.
 */
export const contentValidator = z.object({
  title: z.string().trim().nonempty().max(255),
  slug: optionalText(255),
  kind: z.enum(KINDS),
  source: z.enum(SOURCES).optional(),
  altTitles: z
    .object({ EN: optionalText(255), JP: optionalText(255), TH: optionalText(255) })
    .prefault({}),
  synopsis: optionalText(10_000),
  genres: z.array(z.enum(GENRES)).default([]),
  sourceDir: mediaPath
})

export type ContentValidator = z.infer<typeof contentValidator>

/**
 * One audio version of a season. Whether `pathname` exists is checked in `createSeason`.
 */
const sourceValidator = z.object({
  language: z.enum(Locales),
  pathname: mediaPath,
  isDubbed: z.boolean()
})

/**
 * Import-season form. At most one source is the original audio (`isDubbed: false`); a season may have only
 * dubs. Its primary source (the original, or the first dub without one) must exist and `poster` must be an
 * existing image (checked in `createSeason`). `seasonNo` follows `kind` the way the `seasons_season_no_check`
 * constraint does.
 */
export const seasonValidator = z
  .object({
    contentId: z.uuid(),
    kind: z.enum(SEASON_KINDS).default("season"),
    seasonNo: z.int().min(0).optional(),
    title: optionalText(255),
    synopsis: optionalText(10_000),
    status: z.enum(SEASON_STATUSES).default("finished"),
    sources: z
      .array(sourceValidator)
      .nonempty()
      .refine((sources) => sources.filter((source) => !source.isDubbed).length <= 1, {
        message: "Only one source may be the original audio"
      })
      .refine(
        (sources) =>
          new Set(sources.map((source) => source.language)).size === sources.length,
        {
          message: "Each language may appear only once"
        }
      ),
    poster: mediaPath,
    releasedOn: z.iso.date()
  })
  .refine((season) => season.kind !== "season" || season.seasonNo !== undefined, {
    message: "A season needs a season number",
    path: ["seasonNo"]
  })
  .refine((season) => season.kind !== "movie" || season.seasonNo === undefined, {
    message: "A movie has no season number",
    path: ["seasonNo"]
  })

export type SeasonValidator = z.infer<typeof seasonValidator>
