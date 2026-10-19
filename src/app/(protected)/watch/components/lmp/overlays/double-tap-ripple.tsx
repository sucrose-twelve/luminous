import { cls } from "@/libs/utils"

import type { TapRipple } from "../hooks/use-double-tap"

/**
 * The "−10 s" / "+20 s" bubble on the side of the video that was double-tapped. Keyed by tap, so each tap
 * restarts the fade.
 */
export function DoubleTapRipple({ ripple }: Readonly<{ ripple: TapRipple | null }>) {
  if (!ripple) return null

  return (
    <div
      aria-hidden
      className={cls(
        "pointer-events-none absolute inset-y-0 grid w-[35%] place-items-center",
        ripple.side < 0 ? "left-0" : "right-0"
      )}>
      <span
        key={ripple.id}
        className='animate-osd grid size-28 place-items-center rounded-full bg-white/15 text-lg font-medium text-white tabular-nums backdrop-blur-sm'>
        {`${ripple.total > 0 ? "+" : "−"}${Math.abs(ripple.total)} s`}
      </span>
    </div>
  )
}
