"use client"

import { ArrowUp02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback } from "react"

import { Button } from "@/components/ui/button"

export function BackToTop() {
  const handlePress = useCallback(() => {
    const isReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
    scrollTo({ top: 0, behavior: isReducedMotion ? "auto" : "smooth" })
  }, [])

  return (
    <Button
      variant='ghost'
      size='icon'
      aria-label='Back to top'
      className='size-11 rounded-xl bg-transparent text-zinc-300 hover:text-white'
      onClick={handlePress}>
      <HugeiconsIcon className='size-5.5' icon={ArrowUp02Icon} strokeWidth={1.8} />
    </Button>
  )
}
