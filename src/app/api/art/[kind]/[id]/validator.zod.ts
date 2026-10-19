import { z } from "zod"

export const paramValidator = z.object({
  kind: z.enum(["poster", "thumbnail", "sprite"]),
  id: z.uuid()
})

export type ParamValidator = z.infer<typeof paramValidator>
