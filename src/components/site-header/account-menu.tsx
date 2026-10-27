"use client"

import { Logout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"
import { useCallback, useTransition } from "react"

import { signOut } from "@/actions/auth/sign-out"
import { Avatar } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export type HeaderAccount = {
  email: string
  displayName: string
  avatar: string
}

/**
 * The signed-in visitor's avatar and its menu: who is signed in, and Sign out. `signOut` redirects home, so
 * the item only needs to stay disabled while it runs.
 */
export function AccountMenu({ account }: Readonly<{ account: HeaderAccount }>) {
  const [isPending, startTransition] = useTransition()

  const handleSignOut = useCallback(() => {
    startTransition(async () => {
      await signOut()
    })
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label='Account menu'
        className='focus-visible:ring-ring/50 size-10 cursor-pointer rounded-lg outline-none focus-visible:ring-3'>
        <Avatar className='ring-foreground/10 size-full rounded-lg ring-2 after:rounded-lg'>
          <Image
            className='size-full rounded-lg object-cover'
            alt={account.displayName}
            src={account.avatar}
            width={40}
            height={40}
            quality={100}
            priority
            loading='eager'
          />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        sideOffset={14}
        className='bg-background/50 w-auto min-w-60 rounded-lg p-0 ring-white/10 backdrop-blur-xl'>
        <div className='px-4 pt-3.5 pb-3'>
          <p className='truncate text-sm font-semibold'>{account.displayName}</p>
          <p className='truncate text-xs text-zinc-400'>{account.email}</p>
        </div>
        <DropdownMenuSeparator className='mx-0 my-0 bg-white/10' />
        <DropdownMenuGroup className='p-1'>
          <DropdownMenuItem
            variant='destructive'
            className='rounded-lg px-2.5 py-2'
            disabled={isPending}
            onClick={handleSignOut}>
            <HugeiconsIcon className='size-4.5' icon={Logout01Icon} strokeWidth={1.8} />
            {isPending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
