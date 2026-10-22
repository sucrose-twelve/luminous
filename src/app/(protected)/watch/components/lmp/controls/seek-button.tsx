import { Backward10sIcon, Forward10sIcon } from "@/components/icons"

import { ControlButton } from "./control-button"

/**
 * −10 s / +10 s, on either side of the episode buttons.
 */
export function SeekButton({
  offset,
  onSeek
}: Readonly<{ offset: -10 | 10; onSeek: (delta: number) => void }>) {
  const isForward = offset > 0

  return (
    <ControlButton
      size='md'
      label={isForward ? "Forward 10 seconds (→)" : "Back 10 seconds (←)"}
      onPress={() => onSeek(offset)}>
      {isForward ? <Forward10sIcon /> : <Backward10sIcon />}
    </ControlButton>
  )
}
