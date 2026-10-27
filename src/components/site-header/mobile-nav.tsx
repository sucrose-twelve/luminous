"use client"

import { Menu01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePathname, useRouter } from "next/navigation"
import { useCallback } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { NAV_LINKS } from "@/constants/navigation"
import { useLoader } from "@/hooks"
import { cls } from "@/libs/utils"

import { isNavActive } from "./utils"

/**
 * The section links on phones, where `HeaderNav` is hidden: a menu button whose items navigate.
 */
export function MobileNav() {
  const router = useRouter()
  const loader = useLoader()
  const pathname = usePathname()

  const handleNavigate = useCallback(
    (href: string) => {
      if (href === pathname) return

      loader.on()
      router.push(href)
    },
    [loader, pathname, router]
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label='Open menu'
        render={
          <Button
            variant='ghost'
            size='icon'
            className='size-11 rounded-xl text-white md:hidden'
          />
        }>
        <HugeiconsIcon className='size-6' icon={Menu01Icon} strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        sideOffset={14}
        className='w-auto min-w-52 rounded-2xl bg-black/85 p-1.5 ring-white/10 backdrop-blur-xl'>
        {NAV_LINKS.map((link) => (
          <DropdownMenuItem
            key={link.href}
            label={link.label}
            className={cls(
              "rounded-xl px-3 py-2 font-semibold",
              isNavActive(pathname, link.href) ? "text-primary" : "text-zinc-400"
            )}
            onClick={() => handleNavigate(link.href)}>
            {link.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
