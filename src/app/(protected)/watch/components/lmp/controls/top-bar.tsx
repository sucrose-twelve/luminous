"use client"

import { ChevronLeftIcon } from "@keyline-icons/react/fill"
import NextLink from "next/link"
import { Fragment, useCallback } from "react"

import { cls } from "@/libs/utils"

import { controlClass } from "./control-button"

/**
 * The top of the player (`docs/design/LMP.png`): Back, the content title over `Season 1 • Episode 01`, and
 * the player's buttons on the right (`children`: volume, PiP, fullscreen, Playlist, Preferences). Shows and
 * hides with the other controls. Only the buttons take the pointer, so a tap on the rest of the bar still
 * reaches the video (and hides the controls).
 *
 * Back leaves fullscreen first, so the next page doesn't open inside it.
 *
 * @param subtitle - The parts of the line under the title, joined with dots
 * @param children - The buttons on the right; the Preferences popover opens below them
 */
export function TopBar({
  backHref,
  title,
  subtitle,
  isVisible,
  onHoverChange,
  onFocus,
  children
}: Readonly<{
  backHref: string
  title: string
  subtitle: readonly string[]
  isVisible: boolean
  onHoverChange: (isHovering: boolean) => void
  onFocus: () => void
  children: React.ReactNode
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
        "pointer-events-none absolute inset-x-0 top-0 flex items-center gap-3 bg-linear-to-b from-black/25 to-transparent px-3 pt-3 pb-12 transition-opacity duration-200 sm:gap-6 sm:px-8 sm:pt-6",
        !isVisible && "opacity-0"
      )}>
      <NextLink
        href={backHref}
        aria-label='Back'
        title='Back'
        onClick={handleBack}
        className={cls(controlClass("sm"), isVisible && "pointer-events-auto")}>
        <ChevronLeftIcon />
      </NextLink>
      <div className='min-w-0 grow text-white'>
        <h1 className='truncate text-base font-semibold sm:text-xl'>{title}</h1>
        <p className='flex gap-2 text-xs text-white/75 sm:mt-0.5 sm:gap-3 sm:text-[13px]'>
          {subtitle.map((part, index) => (
            <Fragment key={part}>
              {index > 0 && <span aria-hidden>•</span>}
              <span className={index === 0 ? "truncate" : "shrink-0"}>{part}</span>
            </Fragment>
          ))}
        </p>
      </div>
      <div
        className={cls(
          "relative flex shrink-0 items-center gap-1 sm:gap-2.5",
          isVisible && "pointer-events-auto"
        )}>
        {children}
      </div>
    </div>
  )
}
