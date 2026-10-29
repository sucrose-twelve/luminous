import { formatDateTime } from "@/app/(controls)/utils"

import type { ControlAccountRow } from "./actions/read"

export type StatusChip = { key: string; label: string; className: string; title?: string }

const STATUS_TONES = {
  active: "bg-blue-500/15 text-blue-300",
  inactive: "bg-zinc-500/15 text-zinc-400",
  verified: "bg-indigo-500/15 text-indigo-300",
  suspended: "bg-destructive text-white"
} as const

/**
 * The status chips of an account: Active or Inactive, Verified (only when it is), and Suspended. Suspended is
 * solid rather than soft, so it never reads like the Root chip's red.
 */
export function statusChips({ account }: ControlAccountRow): StatusChip[] {
  return [
    account.isActive
      ? { key: "active", label: "Active", className: STATUS_TONES.active }
      : { key: "inactive", label: "Inactive", className: STATUS_TONES.inactive },
    ...(account.isVerified
      ? [{ key: "verified", label: "Verified", className: STATUS_TONES.verified }]
      : []),
    ...(account.isSuspended
      ? [
          {
            key: "suspended",
            label: "Suspended",
            className: STATUS_TONES.suspended,
            title: account.suspendedAt
              ? `Since ${formatDateTime(account.suspendedAt)}`
              : undefined
          }
        ]
      : [])
  ]
}
