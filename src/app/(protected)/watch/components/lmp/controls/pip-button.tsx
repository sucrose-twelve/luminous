import { PictureInPictureIcon } from "@/app/(protected)/watch/components/lmp/icons"

import { ControlButton } from "./control-button"

/**
 * One icon both ways; the label says which. Hidden where the browser can't open Picture-in-Picture from a
 * page (Firefox).
 */
export function PipButton({
  isSupported,
  isActive,
  onToggle
}: Readonly<{ isSupported: boolean; isActive: boolean; onToggle: () => void }>) {
  if (!isSupported) return null

  return (
    <ControlButton
      className='max-md:hidden'
      label={
        isActive ? "Exit picture-in-picture (Shift+I)" : "Picture-in-picture (Shift+I)"
      }
      onPress={onToggle}>
      <PictureInPictureIcon />
    </ControlButton>
  )
}
