import { cls } from "@/libs/utils"

/**
 * The player's black box, and the page's `<main>` landmark. Rendered alone while the player's JS loads, then
 * by `<Lmp>` as its container, so the page doesn't shift when the player appears.
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
        "relative h-dvh w-full overflow-hidden bg-black data-idle:cursor-none",
        className
      )}>
      {children}
    </main>
  )
}
