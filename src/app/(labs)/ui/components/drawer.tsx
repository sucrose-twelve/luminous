"use client"

import { Button, Spinner, useOverlayState } from "@heroui/react"
import { FilterVerticalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { DrawerComponent } from "@/components/ui/drawer"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"

export function DrawerUI() {
  const control = useOverlayState()

  return (
    <>
      <Button onPress={control.open}>Drawer UI</Button>

      <DrawerComponent control={control}>
        <div className='min-w-80'>
          <ContentHeader
            icon={
              <HugeiconsIcon
                className='size-6 stroke-2 text-zinc-400'
                icon={FilterVerticalIcon}
              />
            }
            title='filter'
            description='Quickly and easily generate Lorem Ipsum placeholder text.'
          />

          <div className='h-dvh p-8'>...</div>

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
                  <span className='text-base font-bold uppercase'>apply</span>
                </>
              )}
            </Button>
          </ContentFooter>
        </div>
      </DrawerComponent>
    </>
  )
}
