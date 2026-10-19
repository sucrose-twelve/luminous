import { NextIcon, PreviousIcon } from "@hugeicons/core-free-icons"

import type { LmpAdjacent } from "../types"
import { episodeLabel, withEpisodeTitle } from "../utils"
import { ControlButton } from "./control-button"

/**
 * Previous / next episode. Disabled (but still focusable) at either end of the content.
 */
export function TrackButton({
  direction,
  target,
  onGo
}: Readonly<{
  direction: "prev" | "next"
  target: LmpAdjacent | null
  onGo: (target: LmpAdjacent) => void
}>) {
  const isNext = direction === "next"
  const label = isNext ? "Next episode (Shift+N)" : "Previous episode (Shift+P)"
  const title = target
    ? `${isNext ? "Next" : "Previous"}: ${withEpisodeTitle(episodeLabel(target, { kind: target.seasonKind, seasonNo: target.seasonNo }, true), target)}`
    : `No ${isNext ? "next" : "previous"} episode`

  return (
    <ControlButton
      label={label}
      title={title}
      icon={isNext ? NextIcon : PreviousIcon}
      isDisabled={!target}
      onPress={() => target && onGo(target)}
    />
  )
}
