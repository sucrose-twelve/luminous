"use server"

import { updateTag } from "next/cache"
import { cookies } from "next/headers"
import { redirect, RedirectType } from "next/navigation"

import { APP_TOKEN } from "@/constants"

import { tokenTag } from "../token"

/**
 * Signs out: drops the cached decrypted token, deletes the cookie, and redirects home.
 *
 * Tokens are stateless, so this ends the session in this browser only. A copy of the token stays valid until it
 * expires.
 */
export async function signOut() {
  const cookieStore = await cookies()
  const token = cookieStore.get(APP_TOKEN)?.value

  if (token) {
    updateTag(tokenTag(token))
  }

  cookieStore.delete(APP_TOKEN)
  redirect("/", RedirectType.replace)
}
