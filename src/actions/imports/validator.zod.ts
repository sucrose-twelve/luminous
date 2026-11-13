import { z } from "zod"

import { IMPORT_FLAG_KEYS, KINDS } from "@/constants"

/**
 * The control panel's Import: one season, or every ongoing season of a content kind, with the script's flags.
 */
export const importValidator = z.object({
  target: z.discriminatedUnion("type", [
    z.object({ type: z.literal("season"), seasonId: z.uuid() }),
    z.object({ type: z.literal("ongoing"), kind: z.enum(KINDS) })
  ]),
  flags: z.array(z.enum(IMPORT_FLAG_KEYS)).default([])
})

export type ImportValidator = z.input<typeof importValidator>
