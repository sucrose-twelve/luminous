import { cls } from "@/libs/utils"

const SIZES = {
  sm: "size-9 sm:size-11 lg:size-12 [&_svg]:size-5 sm:[&_svg]:size-6",
  md: "size-12 sm:size-16 [&_svg]:size-6 sm:[&_svg]:size-8",
  lg: "size-14 sm:size-22 [&_svg]:size-8 sm:[&_svg]:size-10"
} as const

export type ControlSize = keyof typeof SIZES

/**
 * Classes of a round player control (`docs/design/LMP.png`): a dark translucent, blurred disc with the
 * `border-gradient` edge, lighter on hover and keyboard focus. `sm` is the top bar, `md` the seek and
 * episode buttons, `lg` Play. Also styles the top bar's Back link.
 */
export function controlClass(size: ControlSize) {
  return cls(
    "border-gradient grid shrink-0 cursor-pointer place-items-center rounded-full",
    "bg-black/20 text-white backdrop-blur-xl",
    "transition-[background-color,scale] duration-150 select-none",
    "hover:bg-black/15 focus-visible:bg-white/15 active:scale-98",
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-black/40 aria-disabled:active:scale-100",
    SIZES[size]
  )
}

/**
 * An icon-only player button with a tooltip (`title`).
 *
 * A disabled button stays focusable and hoverable (`aria-disabled`, not `disabled`) so its label and tooltip
 * can still be read.
 *
 * @param label - `aria-label`, naming the shortcut: `"Mute (Shift+M)"`
 * @param title - Tooltip, when it should say more than `label`
 * @param panel - Makes it the toggle of a popup (the Preferences menu, a drawer): `id` of the popup and
 * whether it's open, for `aria-expanded` / `aria-controls`. `data-panel` names the popup even while closed, so
 * the popup can hand focus back to its toggle
 * @param children - The icon
 */
export function ControlButton({
  ref,
  label,
  title,
  size = "sm",
  isDisabled = false,
  panel,
  onPress,
  className,
  children
}: Readonly<{
  ref?: React.Ref<HTMLButtonElement>
  label: string
  title?: string
  size?: ControlSize
  isDisabled?: boolean
  panel?: { id: string; isOpen: boolean }
  onPress?: () => void
  className?: string
  children: React.ReactNode
}>) {
  return (
    <button
      ref={ref}
      type='button'
      aria-label={label}
      title={title ?? label}
      aria-disabled={isDisabled || undefined}
      aria-expanded={panel ? panel.isOpen : undefined}
      aria-controls={panel?.isOpen ? panel.id : undefined}
      data-panel={panel?.id}
      onClick={isDisabled ? undefined : onPress}
      className={cls(controlClass(size), className)}>
      {children}
    </button>
  )
}
