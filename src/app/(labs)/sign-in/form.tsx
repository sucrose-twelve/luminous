"use client"

import { useState, useTransition } from "react"

import { signIn } from "@/actions/auth/sign-in"

type Result = Awaited<ReturnType<typeof signIn>>

export function SignInForm() {
  const [result, setResult] = useState<Result | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const response = await signIn({
        identifier: String(formData.get("identifier") ?? ""),
        password: String(formData.get("password") ?? ""),
        keepLoggedIn: formData.get("keepLoggedIn") === "on"
      })

      setResult(response)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>
        <label>
          identifier{" "}
          <input
            name='identifier'
            autoComplete='username'
            placeholder='username or email'
            required
          />
        </label>
      </p>
      <p>
        <label>
          password{" "}
          <input
            type='password'
            name='password'
            autoComplete='current-password'
            required
          />
        </label>
      </p>
      <p>
        <label>
          <input type='checkbox' name='keepLoggedIn' /> keepLoggedIn
        </label>
      </p>
      <button type='submit' disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </form>
  )
}
