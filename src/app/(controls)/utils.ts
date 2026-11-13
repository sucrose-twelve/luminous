import { format, parseISO } from "date-fns"

/**
 * A date the way every control panel table shows it (date-fns `PP`).
 *
 * @param value - A timestamp, or a `date` column's `yyyy-MM-dd`, read as that calendar day rather than UTC
 * midnight
 *
 * @example
 * ```ts
 * formatDate("2026-10-27") // "Oct 27, 2026"
 * ```
 */
export function formatDate(value: Date | string) {
  return format(typeof value === "string" ? parseISO(value) : value, "PP")
}

/**
 * A timestamp with its time of day (date-fns `PPpp`), for tooltips beside `formatDate`.
 *
 * @example
 * ```ts
 * formatDateTime(account.createdAt) // "Oct 27, 2026, 2:05:30 PM"
 * ```
 */
export function formatDateTime(value: Date) {
  return format(value, "PPpp")
}

/**
 * How long something has run, from seconds up to hours, for the import status card.
 *
 * @example
 * ```ts
 * formatElapsed(192_000) // "3m 12s"
 * ```
 */
export function formatElapsed(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}
