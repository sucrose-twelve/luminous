"use client"

import { EdgeLight } from "@/components/edge-light"

import { DrawerUI } from "./components/drawer"
import { ModalUI } from "./components/modal"

export default function UIComponent() {
  return (
    <>
      <EdgeLight />

      <section className='max-w-8xl mx-auto flex flex-col gap-6'>
        <div className='flex gap-6'>
          <DrawerUI />
          <ModalUI />
        </div>
      </section>
    </>
  )
}
