import { ComputerIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cls } from "@/libs/utils"

/**
 * Covers the viewport where the control panel can't be used: a window narrower than 1440px, or a phone or
 * tablet. It sits above dialogs too, since a modal is portalled to `body` and hiding the panel wouldn't hide it.
 */
export function ScreenNotice({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      role='status'
      className={cls(
        "bg-background fixed inset-0 z-100 flex items-center justify-center px-4",
        className
      )}>
      <div className='flex w-full max-w-sm flex-col items-center gap-3 rounded-md bg-zinc-900/80 px-6 py-8 text-center ring-1 ring-white/10'>
        <HugeiconsIcon
          icon={ComputerIcon}
          size={40}
          strokeWidth={1.5}
          className='text-zinc-400'
        />
        <h1 className='text-lg font-medium text-white'>Screen too small</h1>
        <p className='text-sm text-zinc-400'>
          The control panel needs a window at least 1440px wide. Widen the window or open
          it on a desktop.
        </p>
      </div>
    </div>
  )
}
