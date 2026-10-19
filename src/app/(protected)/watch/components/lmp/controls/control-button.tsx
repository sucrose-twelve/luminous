"use client"

import { Button, Tooltip } from "@heroui/react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cls } from "@/libs/utils"

/**
 * An icon-only player button (HeroUI `Button`) with a 44 px hit area and a tooltip.
 *
 * A disabled button stays focusable and hoverable (`aria-disabled`, not `isDisabled`) so its label and tooltip
 * can still be read. Inside a HeroUI `Dropdown` it becomes the menu's trigger, which sets its `aria-haspopup` /
 * `aria-expanded` itself.
 *
 * The icon's size is set inline: HeroUI sizes every `svg` in a button from CSS, which would override `size`.
 *
 * @param label - `aria-label`, naming the shortcut: `"Mute (Shift+M)"`
 * @param title - Tooltip, when it should say more than `label`
 * @param panel - Makes it the toggle of a panel that isn't a menu (the playlist): `id` of the panel and
 * whether it's open
 */
export function ControlButton({
  label,
  title,
  icon,
  iconSize = 26,
  isDisabled = false,
  panel,
  onPress,
  className
}: Readonly<{
  label: string
  title?: string
  icon: IconSvgElement
  iconSize?: number
  isDisabled?: boolean
  panel?: { id: string; isOpen: boolean }
  onPress?: () => void
  className?: string
}>) {
  return (
    <Tooltip delay={500}>
      <Button
        isIconOnly
        variant='ghost'
        aria-label={label}
        aria-disabled={isDisabled || undefined}
        aria-expanded={panel ? panel.isOpen : undefined}
        aria-controls={panel?.isOpen ? panel.id : undefined}
        data-menu-toggle={panel?.id}
        onPress={isDisabled ? undefined : onPress}
        className={cls(
          "data-[focus-visible=true]:ring-theme size-11 shrink-0 rounded-full bg-transparent text-white/90 aria-disabled:pointer-events-auto aria-disabled:cursor-not-allowed aria-disabled:opacity-35 aria-expanded:text-white data-[hovered=true]:bg-transparent data-[hovered=true]:text-white data-[pressed=true]:bg-transparent",
          className
        )}>
        <HugeiconsIcon
          icon={icon}
          strokeWidth={1.5}
          style={{ width: iconSize, height: iconSize }}
        />
      </Button>
      <Tooltip.Content className='bg-black/80 text-xs text-white ring-1 ring-white/10 backdrop-blur-md'>
        {title ?? label}
      </Tooltip.Content>
    </Tooltip>
  )
}
