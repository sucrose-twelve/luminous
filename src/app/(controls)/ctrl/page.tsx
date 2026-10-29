import { redirect } from "next/navigation"

import { CONTROL_HOME } from "@/constants"

/**
 * `/ctrl` has no page of its own: it opens the first tab.
 */
export default function Control() {
  redirect(CONTROL_HOME)
}
