import { GoBackward10SecIcon, GoForward10SecIcon } from "@hugeicons/core-free-icons"

import { ControlButton } from "./control-button"

/**
 * −10 s / +10 s. Hidden on narrow screens, where a double tap on either side of the video seeks instead.
 */
export function SeekButton({
  offset,
  onSeek
}: Readonly<{ offset: -10 | 10; onSeek: (delta: number) => void }>) {
  const isForward = offset > 0

  return (
    <ControlButton
      label={isForward ? "Forward 10 seconds (→)" : "Back 10 seconds (←)"}
      icon={isForward ? GoForward10SecIcon : GoBackward10SecIcon}
      iconSize={28}
      onPress={() => onSeek(offset)}
      className='max-sm:hidden'
    />
  )
}
