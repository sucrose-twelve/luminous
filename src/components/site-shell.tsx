import type { AuthAccount } from "@/actions/auth"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { MainStoreProvider } from "@/stores/main"

/**
 * The site's chrome around a page: header, main, and footer. Shared by every layout whose pages are browsed
 * (not the player), so `(public)` and `(protected)/(site)` look the same.
 */
export function SiteShell({
  account,
  children
}: Readonly<{ account: AuthAccount | null; children: React.ReactNode }>) {
  return (
    <MainStoreProvider>
      <div className='flex min-h-svh flex-col'>
        <SiteHeader account={account} />
        <main className='router-view grow'>{children}</main>
        <SiteFooter />
      </div>
    </MainStoreProvider>
  )
}
