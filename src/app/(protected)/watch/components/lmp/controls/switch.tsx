"use client"

import { m, type Transition } from "framer-motion"

import { cls } from "@/libs/utils"

/**
 * How far the knob travels: the track (28 px) less its padding (2 × 2 px) and the knob (12 px).
 */
const KNOB_TRAVEL = 12

/**
 * The knob springs across while its color fades: a spring would overshoot the color.
 */
const KNOB_TRANSITION: Transition = {
  x: { type: "spring", stiffness: 700, damping: 38 },
  backgroundColor: { duration: 0.2 }
}

/**
 * A switch row of the Preferences menu (`docs/design/LMP.png`): icon, label, and a small track whose knob
 * springs across and changes color (framer-motion). The whole row is the `role='switch'` button, so the
 * label names it.
 *
 * @param className - The row's layout, shared with the menu's other rows
 */
export function Switch({
  label,
  icon,
  isOn,
  onToggle,
  className
}: Readonly<{
  label: string
  icon: React.ReactNode
  isOn: boolean
  onToggle: () => void
  className?: string
}>) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={isOn}
      onClick={onToggle}
      className={className}>
      <span className='flex items-center gap-2.5 [&_svg]:size-4.5 [&_svg]:shrink-0'>
        {icon}
        {label}
      </span>
      <span
        aria-hidden
        className={cls(
          "flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
          isOn ? "bg-white" : "bg-white/25"
        )}>
        <m.span
          className='size-3 rounded-full'
          initial={false}
          animate={{
            x: isOn ? KNOB_TRAVEL : 0,
            backgroundColor: isOn ? "#171717" : "#ffffff"
          }}
          transition={KNOB_TRANSITION}
        />
      </span>
    </button>
  )
}
