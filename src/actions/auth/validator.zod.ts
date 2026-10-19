import { z } from "zod"

/**
 * Sign-in form. `identifier` is either a username or an email address (anything containing `@`). The
 * messages are shown under the fields of the sign-in modal.
 */
export const formValidator = z.object({
  identifier: z
    .string()
    .trim()
    .nonempty({ error: "Enter your username or email" })
    .max(255, { error: "Must be 255 characters or fewer" }),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters" })
    .max(32, { error: "Password must be 32 characters or fewer" }),
  keepLoggedIn: z.boolean().optional()
})

export type FormValidator = z.infer<typeof formValidator>
