"use client"

import { Button, Dropdown, Label, type Key } from "@heroui/react"
import { Menu01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePathname, useRouter } from "next/navigation"
import { useCallback } from "react"

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

  const handleAction = useCallback(
    (key: Key) => {
      const href = String(key)
      if (href === pathname) return

      loader.on()
      router.push(href)
    },
    [loader, pathname, router]
  )

  return (
    <Dropdown>
      <Button
        isIconOnly
        variant='ghost'
        aria-label='Open menu'
        className='size-11 rounded-xl text-xl text-white md:hidden'>
        <HugeiconsIcon className='size-6' icon={Menu01Icon} strokeWidth={2} />
      </Button>
      <Dropdown.Popover
        placement='bottom end'
        offset={14}
        className='min-w-52 rounded-2xl bg-black/85 ring-1 ring-white/10 backdrop-blur-xl'>
        <Dropdown.Menu aria-label='Sections' onAction={handleAction}>
          {NAV_LINKS.map((link) => (
            <Dropdown.Item key={link.href} id={link.href} textValue={link.label}>
              <Label
                className={cls(
                  "font-semibold",
                  isNavActive(pathname, link.href) ? "text-theme" : "text-white"
                )}>
                {link.label}
              </Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
