import { cls } from "@/libs/utils"

import type { LmpActions, LmpProps, LmpStatus } from "../types"
import { PlayButton } from "./play-button"
import { SeekButton } from "./seek-button"
import { TrackButton } from "./track-button"

/**
 * The buttons in the middle of the player (`docs/design/LMP.png`): −10 s, previous, Play / Pause, next,
 * +10 s. Shows and hides with the other controls. Only the buttons take the pointer, so a tap between them
 * still reaches the video.
 *
 * @param onHoverChange - Reports a mouse resting on the buttons, which keeps the controls up
 */
export function PlaybackControls({
  status,
  prev,
  next,
  actions,
  isVisible,
  onHoverChange,
  onFocus
}: Readonly<{
  status: LmpStatus
  prev: LmpProps["prev"]
  next: LmpProps["next"]
  actions: LmpActions
  isVisible: boolean
  onHoverChange: (isHovering: boolean) => void
  onFocus: () => void
}>) {
  return (
    <div
      className={cls(
        "pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-200",
        !isVisible && "opacity-0"
      )}>
      <div
        onPointerEnter={(event) => event.pointerType === "mouse" && onHoverChange(true)}
        onPointerLeave={(event) => event.pointerType === "mouse" && onHoverChange(false)}
        onFocus={onFocus}
        className={cls(
          "flex items-center gap-3 sm:gap-6",
          isVisible && "[&>button]:pointer-events-auto"
        )}>
        <SeekButton offset={-10} onSeek={actions.seekBy} />
        <TrackButton direction='prev' target={prev} onGo={actions.goTo} />
        <PlayButton status={status} onPress={actions.togglePlay} />
        <TrackButton direction='next' target={next} onGo={actions.goTo} />
        <SeekButton offset={10} onSeek={actions.seekBy} />
      </div>
    </div>
  )
}
