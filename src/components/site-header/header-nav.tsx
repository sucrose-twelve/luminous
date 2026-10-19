"use client"

import { usePathname } from "next/navigation"

import { Link } from "@/components/link"
import { NAV_LINKS } from "@/constants/navigation"
import { cls } from "@/libs/utils"

import { isNavActive } from "./utils"

/**
 * The centre of the header bar from `md` up: one pill per section, the current one filled. Phones get the
 * same links from `MobileNav`.
 */
export function HeaderNav() {
  const pathname = usePathname()

  return (
    <ul className='hidden items-center gap-1 md:flex'>
      {NAV_LINKS.map((link) => {
        const isActive = isNavActive(pathname, link.href)

        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cls(
                "block rounded-xl px-4 py-2.25 text-sm font-semibold transition-colors",
                isActive ? "text-white" : "text-zinc-400 hover:text-white"
              )}>
              {link.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
