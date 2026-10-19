"use client"

import { Button } from "@heroui/react"
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
 * "Skip intro" at the bottom right while the playhead is in a skip range (`docs/design/00-Overview.png`). In
 * an outro with a next episode in this language it reads "Next episode" and opens it.
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
    <Button
      variant='ghost'
      onPress={onSkip}
      className={cls(
        "data-[focus-visible=true]:ring-theme pointer-events-auto h-auto origin-bottom-right rounded-md bg-black/60 px-5 py-2.5 text-base font-medium text-white ring-1 ring-white/25 backdrop-blur-md transition data-[hovered=true]:bg-black/80 sm:text-lg",
        !isProminent &&
          !isFresh &&
          "scale-90 opacity-60 data-[hovered=true]:scale-100 data-[hovered=true]:opacity-100 motion-reduce:scale-100"
      )}>
      {label}
    </Button>
  )
}
