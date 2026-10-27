import { MaximizeIcon, MinimizeIcon } from "@keyline-icons/react/fill"

import { ControlButton } from "./control-button"

export function FullscreenButton({
  isSupported,
  isFullscreen,
  onToggle
}: Readonly<{ isSupported: boolean; isFullscreen: boolean; onToggle: () => void }>) {
  if (!isSupported) return null

  return (
    <ControlButton
      label={isFullscreen ? "Exit fullscreen (Shift+F)" : "Fullscreen (Shift+F)"}
      onPress={onToggle}>
      {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
    </ControlButton>
  )
}
