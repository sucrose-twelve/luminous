import { STAFF_ROLES } from "@/constants"

/**
 * Whether a role runs the control panel (`STAFF_ROLES`: `root` or `admin`).
 */
export function isStaff(role: Account.Role) {
  return STAFF_ROLES.includes(role)
}
