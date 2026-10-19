"use client"

import {
  Drawer,
  type DrawerContentProps,
  type UseOverlayStateReturn
} from "@heroui/react"

export function DrawerComponent({
  control,
  children,
  placement = "right"
}: Readonly<{
  control: UseOverlayStateReturn
  children: React.ReactNode
  placement?: DrawerContentProps["placement"]
}>) {
  return (
    <Drawer>
      <Drawer.Backdrop
        className='backdrop-blur-xs'
        isKeyboardDismissDisabled={true}
        isDismissable={false}
        isOpen={control.isOpen}
        onOpenChange={control.setOpen}>
        <Drawer.Content className='p-0 sm:p-4' placement={placement}>
          <Drawer.Dialog className='bg-background w-dvw max-w-dvw overflow-x-hidden overflow-y-auto rounded-xs p-0 shadow-none ring-4 ring-zinc-400/5 sm:w-fit'>
            {children}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
