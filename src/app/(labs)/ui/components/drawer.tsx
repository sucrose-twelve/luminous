"use client"

import { FilterVerticalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { DrawerComponent } from "@/components/ui/drawer"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import { useOverlayState } from "@/hooks"

export function DrawerUI() {
  const control = useOverlayState()

  return (
    <>
      <Button onClick={control.open}>Drawer UI</Button>

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
            <Button className='grow rounded-sm' type='submit' size='lg'>
              <span className='text-base font-bold uppercase'>apply</span>
            </Button>
          </ContentFooter>
        </div>
      </DrawerComponent>
    </>
  )
}
