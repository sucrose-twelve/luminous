"use client"

import { Modal, type UseOverlayStateReturn } from "@heroui/react"
import Image from "next/image"

import { BrandLogo } from "@/components/brand-logo"

import { SignInForm } from "./sign-in-form"

/**
 * The sign-in modal (`docs/design/sign-in/reference-1.webp`): one card with the key art on the left and the
 * form on the right, edged like the header and footer. Phones get the art as a short banner on top.
 *
 * There is no sign-up and no social sign-in (accounts are made on the server), so the reference's tabs and
 * provider buttons become a note under the form. Default export so `SignInButton` can load it on demand.
 */
export default function SignInModal({
  control
}: Readonly<{ control: UseOverlayStateReturn }>) {
  return (
    <Modal>
      <Modal.Backdrop
        variant='blur'
        isOpen={control.isOpen}
        onOpenChange={control.setOpen}>
        <Modal.Container size='lg' placement='center' scroll='outside'>
          <Modal.Dialog className='grid w-full max-w-240 overflow-hidden rounded-[28px] border border-white/8 bg-[#0b0b0c] p-0 shadow-[0_0_0_10px_rgb(255_255_255/0.025),0_40px_120px_rgb(0_0_0/0.6)] sm:w-[calc(100vw-5rem)] sm:rounded-4xl md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
            <Modal.CloseTrigger className='absolute top-4 right-4 z-10 text-zinc-300 md:top-5 md:right-5' />

            <div className='p-2.5 md:p-3.5'>
              <div className='relative flex h-36 flex-col justify-between overflow-hidden rounded-[20px] p-6 md:h-full md:min-h-150 md:rounded-3xl md:p-8'>
                <Image
                  className='object-cover object-[center_20%]'
                  src='/static/images/lominous.webp'
                  alt=''
                  sizes='(max-width: 768px) 100vw, 460px'
                  quality={100}
                  fill
                />
                <div
                  aria-hidden
                  className='absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-black/40'
                />

                <BrandLogo className='relative' />

                <div className='relative hidden flex-col gap-3 md:flex'>
                  <p className='text-5xl leading-[1.05] font-bold tracking-tight'>
                    Your private cinema.
                  </p>
                  <p className='max-w-sm text-lg leading-snug text-zinc-200'>
                    Pick up where you left off, on any screen in the house.
                  </p>
                </div>
              </div>
            </div>

            <div className='flex flex-col justify-center px-6 pt-4 pb-8 sm:px-10 md:px-14 md:py-16'>
              <div className='mx-auto flex w-full max-w-sm flex-col gap-8'>
                <Modal.Header className='items-center gap-2 text-center'>
                  <Modal.Heading className='text-3xl font-semibold tracking-tight md:text-[34px]'>
                    Welcome back
                  </Modal.Heading>
                  <p className='text-sm text-zinc-400'>
                    Sign in with your username or email.
                  </p>
                </Modal.Header>

                <SignInForm onSuccess={control.close} />

                <div className='flex items-center gap-4 text-xs text-zinc-400'>
                  <span aria-hidden className='h-px grow bg-white/10' />
                  No account? Ask whoever runs this server.
                  <span aria-hidden className='h-px grow bg-white/10' />
                </div>
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
