"use client"

import {
  Modal,
  type ModalContainerProps,
  type UseOverlayStateReturn
} from "@heroui/react"

export function ModalComponent({
  control,
  children,
  size = "lg",
  placement = "auto"
}: Readonly<{
  control: UseOverlayStateReturn
  children: React.ReactNode
  size?: ModalContainerProps["size"]
  placement?: ModalContainerProps["placement"]
}>) {
  return (
    <Modal>
      <Modal.Backdrop
        className='backdrop-blur-xs'
        isKeyboardDismissDisabled={true}
        isDismissable={false}
        isOpen={control.isOpen}
        onOpenChange={control.setOpen}>
        <Modal.Container size={size} placement={placement}>
          <Modal.Dialog className='bg-background overflow-x-hidden overflow-y-auto rounded-xs p-0 shadow-none ring-4 ring-zinc-400/5'>
            {children}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
