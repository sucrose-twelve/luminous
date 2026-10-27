"use client"

import { KeyframesDoubleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { ModalComponent } from "@/components/ui/modal"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import { useOverlayState } from "@/hooks"

export function ModalUI() {
  const control = useOverlayState()

  return (
    <>
      <Button onClick={control.open}>Modal UI</Button>

      <ModalComponent control={control} size='md'>
        <div className='min-w-80'>
          <ContentHeader
            icon={
              <HugeiconsIcon
                className='size-6 stroke-2 text-zinc-400'
                icon={KeyframesDoubleIcon}
              />
            }
            title='title'
            description='Quickly and easily generate Lorem Ipsum placeholder text.'
          />

          <div className='p-8'>...</div>

          <ContentFooter onClose={control.close}>
            <Button className='grow rounded-sm' type='submit' size='lg'>
              <span className='text-base font-bold uppercase'>ok</span>
            </Button>
          </ContentFooter>
        </div>
      </ModalComponent>
    </>
  )
}
