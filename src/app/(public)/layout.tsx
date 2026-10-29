import { readSessionAccount, redirectStaff } from "@/actions/auth"
import { SiteShell } from "@/components/site-shell"

/**
 * The layout reads the session for the header's account menu, so it blocks by design (plain SSR) and opts
 * out of instant-navigation validation. A staff account is sent to the control panel instead.
 */
export const instant = false

export default async function PublicLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const account = await readSessionAccount()
  redirectStaff(account)

  return <SiteShell account={account}>{children}</SiteShell>
}
