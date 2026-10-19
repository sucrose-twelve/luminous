"use client"

import { Button, useOverlayState } from "@heroui/react"
import dynamic from "next/dynamic"
import { useCallback, useState } from "react"

const loadSignInModal = () => import("./sign-in-modal")

const SignInModal = dynamic(loadSignInModal, { ssr: false })

/**
 * The header's Sign in button for visitors without a session. The modal (form, validator, react-hook-form)
 * is a separate chunk: it starts loading on hover and mounts on the first press, then stays mounted so
 * closing it can animate.
 */
export function SignInButton() {
  const control = useOverlayState()
  const [hasOpened, setHasOpened] = useState(false)

  const handlePreload = useCallback(() => {
    void loadSignInModal()
  }, [])

  const handleOpen = useCallback(() => {
    setHasOpened(true)
    control.open()
  }, [control])

  return (
    <>
      <Button
        className='bg-theme text-background hover:bg-theme-400 h-10 rounded-xl px-4 text-sm font-semibold'
        onHoverStart={handlePreload}
        onPress={handleOpen}>
        Sign in
      </Button>
      {hasOpened ? <SignInModal control={control} /> : null}
    </>
  )
}
