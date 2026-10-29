import { z } from "zod"

import { EPISODE_KINDS, SKIP_KINDS } from "@/constants"
import { optionalText } from "@/libs/validator.zod"

/**
 * Edit-episode form. `episodeNo` isn't editable: it comes from the file name, which the next import matches
 * episodes by.
 */
export const episodeValidator = z.object({
  kind: z.enum(EPISODE_KINDS),
  title: optionalText(255),
  synopsis: optionalText(10_000),
  airedOn: z
    .union([z.iso.date(), z.literal("")])
    .optional()
    .transform((value) => value || undefined)
})

export type EpisodeValidator = z.infer<typeof episodeValidator>

/**
 * One skip from the skip editor, in whole seconds. That it ends within the episode and doesn't overlap another
 * kind is checked in `saveSkip`, which knows the episode.
 */
export const skipValidator = z
  .object({
    kind: z.enum(SKIP_KINDS),
    from: z.int().min(0),
    to: z.int().min(1)
  })
  .refine((skip) => skip.to - skip.from >= 1, {
    error: "A skip must end at least a second after it starts",
    path: ["to"]
  })

export type SkipValidator = z.infer<typeof skipValidator>
