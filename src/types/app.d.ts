/**
 * AUTH Token
 * ```
 * "PREFIX.ROLE.SUB.EXP"
 * sub = accountId
 * exp = expiredAt (timestamp)
 * ```
 */
declare type AuthToken = `${string}.${Account.Role}.${string}.${number}`

declare type CountdownDuration = Record<
  "years" | "months" | "weeks" | "days" | "hours" | "minutes" | "seconds",
  number
>

/**
 * One page of a list. Page numbers start at 1; `nextPage` / `prevPage` are `null` at either end, and
 * `lastPage` is at least 1 so an empty list still has one (empty) page.
 */
declare type Pagination<T = unknown> = {
  data: T[]
  count: number
  take: number
  currentPage: number
  nextPage: number | null
  prevPage: number | null
  lastPage: number
}

declare type NextParams<T = Record<string, string>> = Readonly<{
  params: Promise<T>
}>

declare type NextSearchParams<T = Record<string, string | string[] | undefined>> =
  Readonly<{
    searchParams: Promise<T>
  }>

/**
 * Safari's ManagedMediaSource (iOS 17.1+, macOS 14+), a MediaSource the browser may evict from on its own.
 * Not in TypeScript's DOM lib yet; it has the same API surface the player uses.
 */
interface Window {
  ManagedMediaSource?: typeof MediaSource
}
