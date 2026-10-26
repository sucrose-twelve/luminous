import {
  PauseIcon,
  PlayIcon,
  ReplayIcon
} from "@/app/(protected)/watch/components/lmp/icons"

import type { LmpStatus } from "../types"
import { ControlButton } from "./control-button"

/**
 * The large Play / Pause button in the middle of the player. Once the episode has ended it replays.
 */
export function PlayButton({
  status,
  onPress
}: Readonly<{ status: LmpStatus; onPress: () => void }>) {
  const isPlaying = status === "playing" || status === "buffering"
  const isEnded = status === "ended"

  return (
    <ControlButton
      size='lg'
      label={isPlaying ? "Pause (Space)" : isEnded ? "Replay (Space)" : "Play (Space)"}
      onPress={onPress}>
      {isPlaying ? <PauseIcon /> : isEnded ? <ReplayIcon /> : <PlayIcon />}
    </ControlButton>
  )
}
