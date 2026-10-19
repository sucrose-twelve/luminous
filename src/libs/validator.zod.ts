import { z } from "zod"

export const paramValidator = z.object({ uuid: z.uuid() })
export type paramValidator = z.infer<typeof paramValidator>
