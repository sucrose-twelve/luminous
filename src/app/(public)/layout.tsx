import { readSessionAccount } from "@/actions/auth"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { MainStoreProvider } from "@/stores/main"

/**
 * The layout reads the session for the header's account menu, so it blocks by design (plain SSR) and opts
 * out of instant-navigation validation.
 */
export const instant = false

export default async function PublicLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const account = await readSessionAccount()

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
