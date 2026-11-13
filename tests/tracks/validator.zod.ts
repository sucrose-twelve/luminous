import { z } from "zod"

import { KINDS } from "@/constants"

export const argsValidator = z.object({
  season: z.uuid().optional(),
  kind: z.enum(KINDS).default("anime_series"),
  remux: z.boolean().default(false),
  force: z.boolean().default(false),
  /**
   * `--cancel-file`: the control panel's Cancel creates this file, and the run stops at its next safe point.
   */
  cancelFile: z.string().nonempty().optional()
})

export type ArgsValidator = z.infer<typeof argsValidator>
