"use client"

import { Button } from "@heroui/react"
import { ArrowUp02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback } from "react"

export function BackToTop() {
  const handlePress = useCallback(() => {
    const isReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
    scrollTo({ top: 0, behavior: isReducedMotion ? "auto" : "smooth" })
  }, [])

  return (
    <Button
      isIconOnly
      variant='ghost'
      aria-label='Back to top'
      className='size-11 rounded-xl bg-transparent text-zinc-300 hover:text-white'
      onPress={handlePress}>
      <HugeiconsIcon icon={ArrowUp02Icon} size={22} strokeWidth={1.8} />
    </Button>
  )
}
