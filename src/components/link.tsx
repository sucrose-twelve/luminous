"use client"

import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useMemo } from "react"

import { useLoader } from "@/hooks"
import { cls } from "@/libs/utils"

export function Link({
  href,
  children,
  className,
  prefetch,
  "aria-current": ariaCurrent
}: Readonly<{
  "href": string
  "children"?: React.ReactNode
  "className"?: string
  "prefetch"?: boolean
  "aria-current"?: "page"
}>) {
  const loader = useLoader()
  const pathname = usePathname()
  /**
   * Exact match: with `includes`, every pathname contains `/`, so a link home never started the loader.
   */
  const isActive = useMemo(() => pathname === href, [pathname, href])

  const handleClick = useCallback(() => {
    if (!isActive) loader.on()
  }, [isActive, loader])

  return (
    <NextLink
      className={cls(className)}
      href={href}
      prefetch={prefetch}
      aria-current={ariaCurrent}
      onClick={handleClick}>
      {children}
    </NextLink>
  )
}
