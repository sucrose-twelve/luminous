"use client"

import { Button, Spinner, useOverlayState } from "@heroui/react"
import { KeyframesDoubleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ModalComponent } from "@/components/ui/modal"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"

export function ModalUI() {
  const control = useOverlayState()

  return (
    <>
      <Button onPress={control.open}>Modal UI</Button>

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
            <Button
              className='bg-theme rounded-sm'
              type='submit'
              variant='primary'
              fullWidth
              isPending={false}>
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color='current' size='sm' /> : null}
                  <span className='text-base font-bold uppercase'>ok</span>
                </>
              )}
            </Button>
          </ContentFooter>
        </div>
      </ModalComponent>
    </>
  )
}
