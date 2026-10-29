import { z } from "zod"

export const paramValidator = z.object({ uuid: z.uuid() })
export type paramValidator = z.infer<typeof paramValidator>

/**
 * An optional text input: an empty field counts as not given.
 *
 * @param max - The longest text accepted, after trimming
 */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)
