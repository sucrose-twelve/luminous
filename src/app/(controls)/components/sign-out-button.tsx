"use client"

import { Logout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useTransition } from "react"

import { signOut } from "@/actions/auth/sign-out"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Signs out from the header. `signOut` redirects home, so the button only stays disabled while it runs.
 */
export function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  const handleClick = useCallback(() => {
    startTransition(async () => {
      await signOut()
    })
  }, [])

  return (
    <Tooltip>
      <TooltipTrigger
        delay={0}
        render={
          <Button
            variant='ghost'
            size='icon'
            aria-label='Sign out'
            disabled={isPending}
            className='ring-foreground/5 size-9 rounded-lg ring-2'
            onClick={handleClick}
          />
        }>
        <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
      </TooltipTrigger>
      <TooltipContent side='bottom' sideOffset={10}>
        Sign out
      </TooltipContent>
    </Tooltip>
  )
}
