import type { Metadata } from "next"
import { cookies } from "next/headers"

import { resolveSession } from "@/actions/auth/read"
import { signOut } from "@/actions/auth/sign-out"
import { APP_TOKEN } from "@/constants"

import { SignInForm } from "./form"

export const metadata: Metadata = { title: "Sign in" }

export default async function SignIn() {
  const cookieStore = await cookies()
  const session = await resolveSession(cookieStore.get(APP_TOKEN)?.value)

  return (
    <>
      <h1>Sign in</h1>
      <SignInForm />
      <h2>Session</h2>
      <pre>{JSON.stringify(session, null, 2)}</pre>
      {session.ok && (
        <form action={signOut}>
          <button type='submit'>Sign out</button>
        </form>
      )}
    </>
  )
}
