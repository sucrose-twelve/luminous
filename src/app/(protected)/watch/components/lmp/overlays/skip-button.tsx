"use client"

import { useEffect, useState } from "react"

import { cls } from "@/libs/utils"

/**
 * How long the button stays at full size after its range starts, before it settles back (unless the controls
 * are up).
 */
const PROMINENT_DURATION = 5_000

const LABELS: Record<Content.Skip["kind"], string> = {
  intro: "Skip intro",
  recap: "Skip recap",
  outro: "Skip credits"
}

/**
 * "Skip intro" at the bottom right while the playhead is in a skip range. In an outro with a next episode in
 * this language it reads "Next episode" and opens it.
 *
 * It stays up when the controls hide, settling smaller and dimmer after a few seconds; the controls showing
 * bring it back. Never takes focus on its own. Key it by range, so each range starts prominent.
 *
 * @param isProminent - Full size and opacity regardless of time (the controls are up)
 */
export function SkipButton({
  kind,
  hasNext,
  isProminent,
  onSkip
}: Readonly<{
  kind: Content.Skip["kind"]
  hasNext: boolean
  isProminent: boolean
  onSkip: () => void
}>) {
  const [isFresh, setIsFresh] = useState(true)
  const label = kind === "outro" && hasNext ? "Next episode" : LABELS[kind]

  useEffect(() => {
    const timer = setTimeout(() => setIsFresh(false), PROMINENT_DURATION)
    return () => clearTimeout(timer)
  }, [])

  return (
    <button
      type='button'
      onClick={onSkip}
      className={cls(
        "border-gradient pointer-events-auto origin-bottom-right cursor-pointer rounded-xl bg-black/50 px-5 py-2.5 text-base font-medium text-white backdrop-blur-md transition hover:bg-black/70 focus-visible:bg-black/70 sm:text-lg",
        !isProminent &&
          !isFresh &&
          "scale-90 opacity-60 hover:scale-100 hover:opacity-100 focus-visible:scale-100 focus-visible:opacity-100 motion-reduce:scale-100"
      )}>
      {label}
    </button>
  )
}
