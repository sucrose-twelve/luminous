import { z } from "zod"

import { KINDS } from "@/constants"

export const argsValidator = z.object({
  season: z.uuid().optional(),
  kind: z.enum(KINDS).default("anime_series"),
  remux: z.boolean().default(false),
  force: z.boolean().default(false)
})

export type ArgsValidator = z.infer<typeof argsValidator>
