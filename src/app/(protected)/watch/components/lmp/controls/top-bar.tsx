"use client"

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import NextLink from "next/link"
import { useCallback } from "react"

import { cls } from "@/libs/utils"

import { PlaylistButton } from "./playlist-button"

/**
 * Back to the content, the episode title (`EP01 • Content title`), and the Playlist button on the right. Shows
 * and hides with the control bar.
 *
 * Back leaves fullscreen first, so the next page doesn't open inside it.
 */
export function TopBar({
  backHref,
  title,
  isVisible,
  onHoverChange,
  onFocus
}: Readonly<{
  backHref: string
  title: string
  isVisible: boolean
  onHoverChange: (isHovering: boolean) => void
  onFocus: () => void
}>) {
  const handleBack = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }, [])

  return (
    <div
      onPointerEnter={(event) => event.pointerType === "mouse" && onHoverChange(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && onHoverChange(false)}
      onFocus={onFocus}
      className={cls(
        "absolute inset-x-0 top-0 flex items-center gap-2 bg-linear-to-b from-black/70 to-transparent px-3 pt-3 pb-12 transition-opacity duration-200 sm:gap-4 sm:px-5 sm:pt-5",
        !isVisible && "pointer-events-none opacity-0"
      )}>
      <NextLink
        href={backHref}
        aria-label='Back'
        title='Back'
        onClick={handleBack}
        className='focus-visible:outline-theme flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 transition-colors hover:text-white focus-visible:outline-2'>
        <HugeiconsIcon icon={ArrowLeft01Icon} size={28} strokeWidth={1.5} />
      </NextLink>
      <h1 className='grow truncate text-lg font-medium text-white sm:text-2xl'>
        {title}
      </h1>
      <PlaylistButton />
    </div>
  )
}
