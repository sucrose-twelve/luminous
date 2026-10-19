import { z } from "zod"

import { Locales } from "@/constants/enum"

/**
 * A change to the account's playback preferences: any of the three fields, at least one.
 *
 * `audioLanguage: null` means "the original audio", whatever language that is for a given content.
 */
export const preferenceValidator = z
  .object({
    audioLanguage: z.enum(Locales).nullable(),
    autoplayNext: z.boolean(),
    autoSkip: z.boolean()
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update" })

export type PreferenceValidator = z.infer<typeof preferenceValidator>
