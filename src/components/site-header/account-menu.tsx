"use client"

import { Avatar, Button, Dropdown, Label, Separator, type Key } from "@heroui/react"
import { Logout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"
import { useCallback, useTransition } from "react"

import { signOut } from "@/actions/auth/sign-out"

export type HeaderAccount = {
  email: string
  displayName: string
  avatar: string
}

/**
 * The signed-in visitor's avatar (their initials) and its menu: who is signed in, and Sign out. `signOut`
 * redirects home, so the item only needs to stay disabled while it runs.
 */
export function AccountMenu({ account }: Readonly<{ account: HeaderAccount }>) {
  const [isPending, startTransition] = useTransition()
  const initials = account.displayName.slice(0, 2).toUpperCase()

  const handleAction = useCallback((key: Key) => {
    if (key !== "sign-out") return

    startTransition(async () => {
      await signOut()
    })
  }, [])

  return (
    <Dropdown>
      <Button
        isIconOnly
        variant='ghost'
        aria-label='Account menu'
        className='size-10 rounded-none bg-transparent p-0'>
        <Avatar size='sm' className='ring-foreground/10 size-full rounded-lg ring-2'>
          <Image
            className='size-10'
            alt={account.displayName}
            src={account.avatar}
            width={40}
            height={40}
            quality={100}
            priority
            loading='eager'
          />
        </Avatar>
      </Button>
      <Dropdown.Popover
        placement='bottom end'
        offset={14}
        className='min-w-60 rounded-2xl bg-black/85 ring-1 ring-white/10 backdrop-blur-xl'>
        <div className='px-4 pt-3.5 pb-3'>
          <p className='truncate text-sm font-semibold'>{account.displayName}</p>
          <p className='truncate text-xs text-zinc-400'>{account.email}</p>
        </div>
        <Separator className='bg-white/10' />
        <Dropdown.Menu
          aria-label='Account'
          disabledKeys={isPending ? ["sign-out"] : []}
          onAction={handleAction}>
          <Dropdown.Item id='sign-out' textValue='Sign out' variant='danger'>
            <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={1.8} />
            <Label>{isPending ? "Signing out…" : "Sign out"}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
