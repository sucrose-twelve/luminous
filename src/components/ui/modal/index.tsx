"use client"

import { useCallback } from "react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { OverlayState } from "@/hooks"
import { cls } from "@/libs/utils"

const SIZES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg"
} as const

/**
 * A plain dark dialog for the `ContentHeader` / body / `ContentFooter` layout. It closes only from inside (the
 * footer's CLOSE): a click outside and `Esc` are ignored.
 */
export function ModalComponent({
  control,
  children,
  size = "lg"
}: Readonly<{
  control: OverlayState
  children: React.ReactNode
  size?: keyof typeof SIZES
}>) {
  const handleOpenChange = useCallback<
    NonNullable<React.ComponentProps<typeof Dialog>["onOpenChange"]>
  >(
    (isOpen, details) => {
      if (details.reason === "escape-key") return
      control.setOpen(isOpen)
    },
    [control]
  )

  return (
    <Dialog open={control.isOpen} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className={cls(
          "bg-background max-h-[calc(100dvh-2rem)] gap-0 overflow-x-hidden overflow-y-auto rounded-xs p-0 text-base shadow-none ring-4 ring-zinc-400/5",
          SIZES[size]
        )}>
        {children}
      </DialogContent>
    </Dialog>
  )
}
