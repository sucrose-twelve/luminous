import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons"

import { ControlButton } from "./control-button"

/**
 * The large ringed Play / Pause button in the middle of the control bar.
 */
export function PlayButton({
  isPlaying,
  onPress
}: Readonly<{ isPlaying: boolean; onPress: () => void }>) {
  return (
    <ControlButton
      label={isPlaying ? "Pause (Space)" : "Play (Space)"}
      icon={isPlaying ? PauseIcon : PlayIcon}
      onPress={onPress}
      className='size-12 text-white ring-2 ring-white/90 transition-transform data-[hovered=true]:scale-105 sm:size-14'
    />
  )
}
