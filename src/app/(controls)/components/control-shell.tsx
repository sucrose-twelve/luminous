import { BrandLogo } from "@/components/brand-logo"
import { Link } from "@/components/link"
import { CONTROL_HOME } from "@/constants"
import { cls } from "@/libs/utils"

import { AccountAvatar } from "./account-avatar"
import { ControlSearch } from "./control-search"
import { ControlTabs } from "./control-tabs"
import { RoleBadge } from "./role-badge"
import { SignOutButton } from "./sign-out-button"

/**
 * The width every control panel row shares: header rows and page content line up on it.
 */
const CONTAINER = "mx-auto w-full max-w-[1472px] px-6"

export type ShellAccount = {
  displayName: string
  avatar: string
  role: Account.Role
}

/**
 * The control panel's chrome (`docs/design/controls/page-layout.png`): logo and search on the first row, the
 * section tabs and the signed-in account on the second. No footer.
 */
export function ControlShell({
  account,
  children
}: Readonly<{ account: ShellAccount; children: React.ReactNode }>) {
  return (
    <div className='flex min-h-svh flex-col'>
      <header className='bg-background/95 sticky top-0 z-50 border-b border-white/5 backdrop-blur-2xl'>
        <div className={CONTAINER}>
          <div className='grid h-16 grid-cols-[1fr_auto_1fr] items-center'>
            <Link href={CONTROL_HOME} className='justify-self-start'>
              <BrandLogo />
            </Link>
            <ControlSearch />
          </div>

          <div className='flex h-12 items-end justify-between'>
            <ControlTabs />

            <div className='flex items-center gap-3 pb-2'>
              <SignOutButton />
              <div className='flex items-center gap-2.5'>
                <AccountAvatar
                  avatar={account.avatar}
                  name={account.displayName}
                  size={36}
                />
                <div className='flex flex-col items-start gap-0.5'>
                  <span className='max-w-40 truncate text-sm font-medium capitalize'>
                    {account.displayName}
                  </span>
                  <RoleBadge role={account.role} className='h-4 px-1.5 text-[10px]' />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={cls(CONTAINER, "grow py-10")}>{children}</main>
    </div>
  )
}
