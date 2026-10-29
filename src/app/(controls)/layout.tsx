import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { userAgentFromString } from "next/server"

import { readSessionAccount } from "@/actions/auth"
import { clientInfo } from "@/actions/client"
import { Toaster } from "@/components/ui/sonner"
import { isStaff } from "@/libs/account"
import { MainStoreProvider } from "@/stores/main"

import { ControlShell } from "./components/control-shell"
import { ScreenNotice } from "./components/screen-notice"

/**
 * Reads the session to admit staff only, so it blocks by design (plain SSR) and opts out of
 * instant-navigation validation.
 */
export const instant = false

export const metadata: Metadata = {
  title: { template: "%s • Control • Luminous", default: "Control • Luminous" }
}

/**
 * The control panel for staff (`isStaff`). Anyone else gets a 404, so the panel doesn't reveal it exists; staff
 * sign in from the site, whose layouts send them here (`redirectStaff`).
 *
 * The panel is for desktops: phones and tablets get only the notice, and a desktop window narrower than
 * 1440px gets it over the panel (CSS only, so a half-filled form survives resizing).
 *
 * This check is only the door: every reader and action guards itself with `withRole(STAFF_ROLES, …)`.
 */
export default async function ControlsLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const account = await readSessionAccount()
  if (!account || !isStaff(account.role)) notFound()

  const { userAgent } = await clientInfo()
  const { type } = userAgentFromString(userAgent).device
  if (type === "mobile" || type === "tablet") return <ScreenNotice />

  return (
    <MainStoreProvider>
      <ControlShell
        account={{
          displayName: account.profile.displayName,
          avatar: account.profile.avatar,
          role: account.role
        }}>
        {children}
      </ControlShell>
      <ScreenNotice className='min-[1440px]:hidden' />
      <Toaster position='bottom-right' />
    </MainStoreProvider>
  )
}
