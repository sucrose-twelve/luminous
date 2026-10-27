import { ListVideoIcon } from "@keyline-icons/react/fill"

import { ControlButton } from "./control-button"

export const PLAYLIST_DRAWER_ID = "lmp-playlist"

/**
 * Opens the Playlist drawer. Its open state lives in the player store, so the drawer stays open across
 * episodes; the session passes it in.
 */
export function PlaylistButton({
  isOpen,
  onToggle
}: Readonly<{ isOpen: boolean; onToggle: () => void }>) {
  return (
    <ControlButton
      label='Playlist'
      panel={{ id: PLAYLIST_DRAWER_ID, isOpen }}
      onPress={onToggle}>
      <ListVideoIcon />
    </ControlButton>
  )
}
