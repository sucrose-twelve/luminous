"use client"

import { Folder01Icon, Tv01Icon, UserMultiple02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { usePathname } from "next/navigation"

import { Link } from "@/components/link"
import { cls } from "@/libs/utils"

const TABS: { href: string; label: string; icon: IconSvgElement }[] = [
  { href: "/ctrl/contents", label: "Contents", icon: Folder01Icon },
  { href: "/ctrl/seasons", label: "Seasons", icon: Tv01Icon },
  { href: "/ctrl/accounts", label: "Accounts", icon: UserMultiple02Icon }
]

/**
 * The section tabs under the header's first row. A tab stays selected on every page below it, so a season's
 * page keeps `Seasons` underlined.
 */
export function ControlTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label='Sections' className='flex h-full items-end gap-6'>
      {TABS.map((tab) => {
        const isCurrent = pathname === tab.href || pathname.startsWith(`${tab.href}/`)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isCurrent ? "page" : undefined}
            className={cls(
              "flex h-full items-center gap-2 border-b-2 px-0.5 text-sm font-medium transition-colors",
              isCurrent
                ? "border-foreground text-foreground"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}>
            <HugeiconsIcon icon={tab.icon} size={16} strokeWidth={1.8} />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
