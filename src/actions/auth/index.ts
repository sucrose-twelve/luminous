import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"

import { APP_TOKEN, CONTROL_HOME } from "@/constants"
import { isStaff } from "@/libs/account"

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
 * `withAuth` for code only some roles may run, such as the control panel's (`STAFF_ROLES`).
 *
 * The role is the account's role in the DB (`resolveSession`), never the one in the token. Any other role
 * redirects through `ErrorBoundary` with `403`.
 *
 * @param roles - The roles allowed to run `action`
 *
 * @example
 * ```ts
 * export const updateContent = withRole(STAFF_ROLES, async (account, input: unknown) => { … })
 * ```
 */
export function withRole<T extends unknown[], R>(
  roles: readonly Account.Role[],
  action: AuthAction<T, R>
) {
  return withAuth<T, R>(async (account, ...args) => {
    if (!roles.includes(account.role)) {
      ErrorBoundary("403 Forbidden")
    }

    return action(account, ...args)
  })
}

/**
 * Sends a staff account (`isStaff`) to the control panel: staff run `/ctrl` only, so every site layout calls
 * this with the account it read.
 *
 * @param account - The signed-in account, or `null` for a visitor (left where they are)
 */
export function redirectStaff(account: AuthAccount | null) {
  if (account && isStaff(account.role)) {
    redirect(CONTROL_HOME)
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
