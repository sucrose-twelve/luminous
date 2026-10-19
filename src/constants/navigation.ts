/**
 * The site's main sections, shared by the header and the footer. Only routes that exist belong here: add My
 * List and History when their pages are built.
 */
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" }
] as const

export type NavLink = (typeof NAV_LINKS)[number]
