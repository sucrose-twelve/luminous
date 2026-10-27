"use client"

import { useCallback } from "react"

import { Sheet, SheetContent } from "@/components/ui/sheet"
import type { OverlayState } from "@/hooks"

/**
 * A dark panel from the right edge for the `ContentHeader` / body / `ContentFooter` layout: full screen on
 * phones, floating inside a 1rem margin from `sm` up. Like `ModalComponent`, it closes only from inside.
 *
 * The overrides repeat the `data-[side=right]:` prefix of `SheetContent`'s own classes so they replace them.
 */
export function DrawerComponent({
  control,
  children
}: Readonly<{
  control: OverlayState
  children: React.ReactNode
}>) {
  const handleOpenChange = useCallback<
    NonNullable<React.ComponentProps<typeof Sheet>["onOpenChange"]>
  >(
    (isOpen, details) => {
      if (details.reason === "escape-key") return
      control.setOpen(isOpen)
    },
    [control]
  )

  return (
    <Sheet open={control.isOpen} onOpenChange={handleOpenChange} disablePointerDismissal>
      <SheetContent
        side='right'
        showCloseButton={false}
        className='bg-background gap-0 overflow-x-hidden overflow-y-auto rounded-xs p-0 text-base shadow-none ring-4 ring-zinc-400/5 data-[side=right]:w-dvw data-[side=right]:max-w-dvw data-[side=right]:border-l-0 data-[side=right]:sm:inset-y-4 data-[side=right]:sm:right-4 data-[side=right]:sm:h-auto data-[side=right]:sm:w-fit data-[side=right]:sm:max-w-[calc(100dvw-2rem)]'>
        {children}
      </SheetContent>
    </Sheet>
  )
}
