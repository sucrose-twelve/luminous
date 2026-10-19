import {
  PictureInPictureExitIcon,
  PictureInPictureOnIcon
} from "@hugeicons/core-free-icons"

import { ControlButton } from "./control-button"

/**
 * Hidden where the browser can't open Picture-in-Picture from a page (Firefox).
 */
export function PipButton({
  isSupported,
  isActive,
  onToggle
}: Readonly<{ isSupported: boolean; isActive: boolean; onToggle: () => void }>) {
  if (!isSupported) return null

  return (
    <ControlButton
      label={
        isActive ? "Exit picture-in-picture (Shift+I)" : "Picture-in-picture (Shift+I)"
      }
      icon={isActive ? PictureInPictureExitIcon : PictureInPictureOnIcon}
      onPress={onToggle}
    />
  )
}
