import { ArrowExpandIcon, ArrowShrinkIcon } from "@hugeicons/core-free-icons"

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
      icon={isFullscreen ? ArrowShrinkIcon : ArrowExpandIcon}
      onPress={onToggle}
    />
  )
}
