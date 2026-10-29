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
