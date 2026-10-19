import { z } from "zod"

export const argsValidator = z.object({
  season: z.uuid(),
  remux: z.boolean().default(false),
  force: z.boolean().default(false)
})

export type ArgsValidator = z.infer<typeof argsValidator>
