import { readSessionAccount } from "@/actions/auth"
import { SiteShell } from "@/components/site-shell"

/**
 * Chrome for the protected pages that are browsed like the public ones (not the player). The pages check
 * the session themselves (`withAuth`, close to the data); the layout only reads it for the header.
 */
export const instant = false

export default async function SiteLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const account = await readSessionAccount()

  return <SiteShell account={account}>{children}</SiteShell>
}
