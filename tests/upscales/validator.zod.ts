import { z } from "zod"

import { FRAME_RATES, SCALES } from "./constants"
import { toNativePath } from "./utils"

/**
 * `scale` comes out as the target short side in pixels and `frame` as the target frame rate.
 */
export const argsValidator = z.object({
  dir: z.string().transform(toNativePath),
  out: z.string().transform(toNativePath).optional(),
  scale: z
    .string()
    .transform((value) => SCALES[value.toLowerCase()])
    .pipe(z.number({ error: "Must be 720p, 1080p, 1440p or 2160p" })),
  frame: z.coerce.number().pipe(z.literal(FRAME_RATES, "Must be 30 or 60")),
  content: z.enum(["real", "anime"]).default("real"),
  gpu: z.coerce.number().int().min(0).default(0),
  video2x: z.string().transform(toNativePath).optional(),
  overwrite: z.boolean().default(false),
  dryRun: z.boolean().default(false)
})

export type ArgsValidator = z.infer<typeof argsValidator>
