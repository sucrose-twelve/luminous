import { z } from "zod"

export const paramValidator = z.object({
  vid: z.uuid()
})

export type ParamValidator = z.infer<typeof paramValidator>
