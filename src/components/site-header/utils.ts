import type { NavLink } from "@/constants/navigation"

/**
 * Whether `href` is the section the visitor is in. Home matches only itself; every other section also
 * matches its nested pages.
 */
export function isNavActive(pathname: string, href: NavLink["href"]) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`)
}
