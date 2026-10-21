import { cls } from "@/libs/utils"

/**
 * The player's black box, and the page's `<main>` landmark. Rendered alone while the player's JS loads, then
 * by `<Lmp>` as its container, so the page doesn't shift when the player appears.
 *
 * `lmp` scopes the player's global styles (`styles/globals.css`: no focus outlines). `touch-manipulation`
 * stops a quick double tap on a button from zooming the page.
 */
export function PlayerFrame({
  ref,
  children,
  className
}: Readonly<{
  ref?: React.Ref<HTMLElement>
  children?: React.ReactNode
  className?: string
}>) {
  return (
    <main
      ref={ref}
      className={cls(
        "lmp relative h-dvh w-full touch-manipulation overflow-hidden bg-black data-idle:cursor-none",
        className
      )}>
      {children}
    </main>
  )
}
