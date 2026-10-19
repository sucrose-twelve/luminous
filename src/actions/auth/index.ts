import { cookies } from "next/headers"
import type { NextRequest } from "next/server"

import { APP_TOKEN } from "@/constants"

import { ErrorBoundary } from "../error"
import { resolveSession, type AuthAccount } from "./read"

export type { AuthAccount }

type AuthAction<T extends unknown[], R> = (account: AuthAccount, ...args: T) => Promise<R>

/**
 * Wraps a Server Action or server reader so it only runs for a signed-in, active account.
 *
 * On failure it redirects through `ErrorBoundary` (`401` / `423`). Route Handlers must use `withGuard`
 * instead, because a redirect is the wrong answer to a media request.
 *
 * @example
 * ```ts
 * export const updateProgress = withAuth(async (account, input: unknown) => { … })
 * ```
 */
export function withAuth<T extends unknown[], R>(action: AuthAction<T, R>) {
  return async (...args: T): Promise<R> => {
    const cookieStore = await cookies()
    const session = await resolveSession(cookieStore.get(APP_TOKEN)?.value)

    if (!session.ok) {
      ErrorBoundary(session.error)
    }

    return action(session.account, ...args)
  }
}

/**
 * Reads the signed-in account for a page anyone can open, where a visitor without a session is normal.
 *
 * Same checks as `withAuth`, but it returns `null` instead of redirecting, so the page renders its signed-out
 * view.
 *
 * @returns The account, or `null` when the cookie is missing, invalid, expired, or the account is blocked
 */
export async function readSessionAccount() {
  const cookieStore = await cookies()
  const session = await resolveSession(cookieStore.get(APP_TOKEN)?.value)
  return session.ok ? session.account : null
}

/**
 * Resolves the account behind a Route Handler request from the auth cookie.
 *
 * The Route Handler counterpart of `withAuth`: same checks (token, account exists, not suspended), but it
 * returns `null` instead of redirecting, so the handler can answer `401` itself.
 *
 * @param request - The incoming Route Handler request
 * @returns The account, or `null` when the cookie is missing, invalid, expired, or the account is blocked
 *
 * @example
 * ```ts
 * const account = await withGuard(request)
 * if (!account) return new Response(null, { status: 401 })
 * ```
 */
export async function withGuard(request: NextRequest) {
  const session = await resolveSession(request.cookies.get(APP_TOKEN)?.value)
  return session.ok ? session.account : null
}
