"use client"

import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useMemo } from "react"

import { useLoader } from "@/hooks"
import { cls } from "@/libs/utils"

/**
 * `next/link` that starts the top loader bar. Other props (`ref`, `aria-*`, handlers) pass through, so it can
 * be the `render` element of a Base UI part, such as a tooltip trigger.
 */
export function Link({
  href,
  className,
  onClick,
  ...props
}: Readonly<Omit<React.ComponentProps<typeof NextLink>, "href"> & { href: string }>) {
  const loader = useLoader()
  const pathname = usePathname()
  /**
   * Exact match: with `includes`, every pathname contains `/`, so a link home never started the loader.
   */
  const isActive = useMemo(() => pathname === href, [pathname, href])

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isActive) loader.on()
      onClick?.(event)
    },
    [isActive, loader, onClick]
  )

  return (
    <NextLink {...props} className={cls(className)} href={href} onClick={handleClick} />
  )
}
