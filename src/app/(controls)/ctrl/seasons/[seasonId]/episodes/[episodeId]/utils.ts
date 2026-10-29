import { pad2 } from "@/libs/utils"

/**
 * Seconds as the skip editor's `HH:MM:SS` (`docs/design/controls/skip-editer.png`).
 *
 * @example
 * ```ts
 * formatClock(662) // "00:11:02"
 * ```
 */
export function formatClock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  return [Math.floor(whole / 3600), Math.floor((whole % 3600) / 60), whole % 60]
    .map(pad2)
    .join(":")
}

/**
 * Reads a typed time back into whole seconds: `HH:MM:SS`, `MM:SS`, or plain seconds.
 *
 * @returns The seconds, or `null` when the text isn't a time
 *
 * @example
 * ```ts
 * parseClock("00:11:02") // 662
 * parseClock("11:02") // 662
 * parseClock("1:2:3:4") // null
 * ```
 */
export function parseClock(text: string) {
  const parts = text.trim().split(":")
  if (parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) return null

  return parts.reduce((total, part) => total * 60 + Number(part), 0)
}

/**
 * The size of a file for the tracks table, in binary units.
 *
 * @example
 * ```ts
 * formatBytes(1_335_000_000) // "1.24 GB"
 * ```
 */
export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"]
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024))
  )
  const value = bytes / 1024 ** exponent

  return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`
}
