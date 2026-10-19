"use client"

import { ListVideoIcon } from "@hugeicons/core-free-icons"

import { usePlayerStore } from "@/stores/player"

import { ControlButton } from "./control-button"

export const PLAYLIST_PANEL_ID = "lmp-playlist"

/**
 * Before the panel closes, moves focus out of it to the top bar's Playlist button, so focus doesn't fall to
 * the page when the panel unmounts.
 */
export function releasePlaylistFocus() {
  const panel = document.getElementById(PLAYLIST_PANEL_ID)
  if (!panel?.contains(document.activeElement)) return

  const toggles = document.querySelectorAll<HTMLElement>(
    `[data-menu-toggle="${PLAYLIST_PANEL_ID}"]`
  )
  Array.from(toggles)
    .find((toggle) => !panel.contains(toggle))
    ?.focus()
}

/**
 * Opens and closes the Playlist panel: in the top bar, and as the icon in the panel's own header. The open
 * state lives in the player store, so the panel stays open across episodes.
 */
export function PlaylistButton({
  label = "Playlist",
  className
}: Readonly<{ label?: string; className?: string }>) {
  const isOpen = usePlayerStore((state) => state.playlistOpen)
  const setPlaylistOpen = usePlayerStore((state) => state.setPlaylistOpen)

  return (
    <ControlButton
      label={label}
      icon={ListVideoIcon}
      panel={{ id: PLAYLIST_PANEL_ID, isOpen }}
      onPress={() => {
        if (isOpen) releasePlaylistFocus()
        setPlaylistOpen(!isOpen)
      }}
      className={className}
    />
  )
}
