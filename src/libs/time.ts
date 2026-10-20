import { pad2 } from "@/libs/utils"

/**
 * Formats seconds as `mm:ss`, or `h:mm:ss` when the episode is an hour or longer, so both ends of the
 * progress bar use the same shape. Negative and `NaN` read as `0`.
 *
 * @param seconds - The time to format
 * @param totalSeconds - The episode duration, which picks the format
 *
 * @example
 * ```ts
 * formatTime(312, 1440) // "05:12"
 * formatTime(312, 6120) // "0:05:12"
 * ```
 */
export function formatTime(seconds: number, totalSeconds: number) {
  const value = Math.floor(Number.isFinite(seconds) && seconds > 0 ? seconds : 0)
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)

  return totalSeconds >= 3600
    ? `${hours}:${pad2(minutes)}:${pad2(value % 60)}`
    : `${pad2(hours * 60 + minutes)}:${pad2(value % 60)}`
}

/**
 * Reads seconds out for screen readers, e.g. `"5 minutes 12 seconds"`.
 */
export function formatSpokenTime(seconds: number) {
  const value = Math.floor(Number.isFinite(seconds) && seconds > 0 ? seconds : 0)
  const parts = [
    [Math.floor(value / 3600), "hour"],
    [Math.floor((value % 3600) / 60), "minute"],
    [value % 60, "second"]
  ] as const

  const spoken = parts
    .filter(([amount]) => amount > 0)
    .map(([amount, unit]) => `${amount} ${unit}${amount === 1 ? "" : "s"}`)
  return spoken.length ? spoken.join(" ") : "0 seconds"
}
