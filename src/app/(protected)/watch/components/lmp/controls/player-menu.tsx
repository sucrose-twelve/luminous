"use client"

import { Dropdown } from "@heroui/react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import type { RefObject } from "react"

/**
 * Classes for a `Dropdown.Item` of a player menu: plain rows on dark glass, brightened on hover and focus.
 */
export const PLAYER_MENU_ITEM =
  "data-[focus-visible=true]:ring-theme min-h-0 justify-between rounded-xs px-0 py-2 text-sm text-white/85 data-[focused=true]:text-white data-[hovered=true]:bg-transparent data-[hovered=true]:text-white"

/**
 * The frame shared by the Audio Tracks and Preferences menus (`docs/design/01-Actions.png`): a HeroUI
 * `Dropdown` whose popover shows an icon and title, a divider, then the menu. It opens above the progress bar
 * (`anchorRef`), on the side of its button, rather than over the button itself.
 *
 * React Aria does the rest: focus moves to the checked item (or the first one) and returns to the button on
 * close, the arrows move between items, and Escape or a click outside closes it.
 *
 * @param trigger - The `ControlButton` that opens it
 * @param children - The `Dropdown.Menu`
 */
export function PlayerMenu({
  title,
  icon,
  align,
  anchorRef,
  isOpen,
  onOpenChange,
  trigger,
  children
}: Readonly<{
  title: string
  icon: IconSvgElement
  align: "start" | "end"
  anchorRef: RefObject<HTMLElement | null>
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
}>) {
  return (
    <Dropdown isOpen={isOpen} onOpenChange={onOpenChange}>
      {trigger}
      <Dropdown.Popover
        triggerRef={anchorRef}
        placement={align === "start" ? "top start" : "top end"}
        offset={12}
        className='w-64 max-w-[calc(100vw-2rem)] rounded-md bg-black/75 px-5 py-4 text-white shadow-none ring-1 ring-white/10 backdrop-blur-md md:min-w-0'>
        <div className='flex items-center gap-3 pb-3'>
          <HugeiconsIcon icon={icon} size={20} strokeWidth={1.5} />
          <span className='font-medium'>{title}</span>
        </div>
        <div className='border-t border-white/15 pt-2'>{children}</div>
      </Dropdown.Popover>
    </Dropdown>
  )
}
