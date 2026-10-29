import { Badge } from "@/components/ui/badge"
import { ROLE_LABELS } from "@/constants"
import { cls } from "@/libs/utils"

const ROLE_TONES: Record<Account.Role, string> = {
  root: "bg-red-500/15 text-red-300",
  admin: "bg-amber-500/15 text-amber-300",
  user: "bg-teal-500/15 text-teal-300"
}

/**
 * An account's role as a soft chip, in the header and the accounts table.
 */
export function RoleBadge({
  role,
  className
}: Readonly<{ role: Account.Role; className?: string }>) {
  return <Badge className={cls(ROLE_TONES[role], className)}>{ROLE_LABELS[role]}</Badge>
}
