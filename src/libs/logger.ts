import { differenceInMilliseconds, format } from "date-fns"

export const COLOR = {
  RESET: "\x1b[0m",
  BRIGHT: "\x1b[1m",
  DIM: "\x1b[2m",
  UNDERSCORE: "\x1b[4m",
  BLINK: "\x1b[5m",
  REVERSE: "\x1b[7m",
  HIDDEN: "\x1b[8m",

  FG: {
    Black: "\x1b[30m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m",
    Blue: "\x1b[34m",
    Magenta: "\x1b[35m",
    Cyan: "\x1b[36m",
    White: "\x1b[37m",
    Gray: "\x1b[90m"
  },

  BG: {
    Black: "\x1b[40m",
    Red: "\x1b[41m",
    Green: "\x1b[42m",
    Yellow: "\x1b[43m",
    Blue: "\x1b[44m",
    Magenta: "\x1b[45m",
    Cyan: "\x1b[46m",
    White: "\x1b[47m",
    Gray: "\x1b[100m"
  }
}

const PREFIX = `${COLOR.FG.Green}[LUMINOUS]${COLOR.RESET}`

/**
 * Logs a message with a timestamp and optional duration.
 *
 * Example Output:
 * ```mdx
 * [PREFIX] - Dec 31, 2025 12:00:00 PM Process started
 * [PREFIX] - Dec 31, 2025 12:00:02 PM Process finished ~ 2.50s
 * ```
 */
export function logger(message: string, startedAt?: Date) {
  const now = new Date()
  const timestamp = `${COLOR.FG.Gray}${format(now, "PPpp")}${COLOR.RESET}`
  const parts = [PREFIX, "—", timestamp, " ", `${message}${COLOR.RESET}`]

  if (startedAt) {
    const diff = differenceInMilliseconds(now, startedAt)
    let duration = `${diff}ms`

    if (diff >= 3_600_000) {
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = ((diff % 60_000) / 1_000).toFixed(2)
      duration = `${h}h ${m}m ${s}s`
    } else if (diff >= 60_000) {
      const m = Math.floor(diff / 60_000)
      const s = ((diff % 60_000) / 1_000).toFixed(2)
      duration = `${m}m ${s}s`
    } else if (diff >= 1_000) {
      duration = `${(diff / 1_000).toFixed(2)}s`
    }

    parts.push(`${COLOR.FG.Gray}~`, `${COLOR.FG.Magenta}${duration}${COLOR.RESET}`)
  }

  console.log(...parts)
}
