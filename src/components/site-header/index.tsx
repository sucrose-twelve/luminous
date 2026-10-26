import { Button, Separator, Tooltip } from "@heroui/react"
import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { AuthAccount } from "@/actions/auth"
import { BrandLogo } from "@/components/brand-logo"
import { Link } from "@/components/link"
import { SignInButton } from "@/components/sign-in/sign-in-button"
import { cls } from "@/libs/utils"

import { AccountMenu } from "./account-menu"
import { HeaderSearch } from "./header-search"
import { MobileNav } from "./mobile-nav"

/**
 * The site header: a floating glass bar that sticks to the top, edged like the footer card so the two read as
 * a pair. Logo on the left, section links in the centre, search and the account on the right.
 *
 * Only the display name and email reach the client, not the whole account.
 */
export function SiteHeader({ account }: Readonly<{ account: AuthAccount | null }>) {
  return (
    <header
      className={cls(
        "sticky top-0 z-50",
        "bg-background/95 shadow-background/25 border-b border-zinc-900/50 shadow-xl backdrop-blur-2xl backdrop-saturate-150"
      )}>
      <nav
        aria-label='Main'
        className={cls(
          "max-w-8xl relative mx-auto h-14 w-full px-4 md:h-16",
          "flex items-center justify-between"
        )}>
        <div
          aria-hidden
          className='via-theme/75 absolute bottom-0 left-1/2 h-px w-1/2 bg-linear-to-r from-transparent to-transparent'
        />

        <Link href='/' className='hidden justify-self-start sm:block'>
          <BrandLogo />
        </Link>

        {/* <HeaderNav /> */}

        <div className='flex items-center justify-between max-md:w-full md:gap-4 md:justify-self-end'>
          <div className='flex gap-x-1'>
            <MobileNav />
            <HeaderSearch />
          </div>

          <div className='flex grow justify-end gap-x-4'>
            {account ? (
              <>
                <Separator className='bg-white/5 max-sm:hidden' orientation='vertical' />

                <Tooltip delay={0}>
                  <Link href='/watch-histories'>
                    <Button
                      className='ring-foreground/5 size-10 rounded-lg ring-2'
                      variant='ghost'
                      isIconOnly>
                      <HugeiconsIcon
                        className='size-5'
                        icon={Clock01Icon}
                        strokeWidth={2}
                      />
                    </Button>
                  </Link>

                  <Tooltip.Content showArrow placement='bottom' offset={16}>
                    <Tooltip.Arrow />
                    <p>Watch History</p>
                  </Tooltip.Content>
                </Tooltip>

                <AccountMenu
                  account={{
                    displayName: account.profile?.displayName ?? account.username,
                    email: account.email,
                    avatar: account.profile.avatar
                  }}
                />
              </>
            ) : (
              <SignInButton />
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
