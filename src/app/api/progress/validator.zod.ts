import { z } from "zod"

/**
 * The watch-progress beacon body. The duration isn't sent: the server takes it from the track, so the client
 * can't decide when an episode counts as finished.
 */
export const progressValidator = z.object({
  trackId: z.uuid(),
  position: z.number().min(0)
})

export type ProgressValidator = z.infer<typeof progressValidator>
