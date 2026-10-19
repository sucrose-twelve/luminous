import { z } from "zod"

export const paramValidator = z.object({
  seasonId: z.uuid()
})

export type ParamValidator = z.infer<typeof paramValidator>
