"use client"

import { VolumeIcon, VolumeLowIcon, VolumeOffIcon } from "@/components/icons"
import { usePlayerStore } from "@/stores/player"

import type { LmpActions } from "../types"
import { ControlButton } from "./control-button"

/**
 * Mute / unmute. There is no volume slider: ↑ / ↓ change the volume (`notes/new-lmp-spec.md`). The icon
 * follows the level: off when muted or at 0, low up to 50 %, full above. Reads the store, which `<Lmp>` keeps
 * in sync with the `<video>`.
 */
export function VolumeButton({ actions }: Readonly<{ actions: LmpActions }>) {
  const volume = usePlayerStore((state) => state.volume)
  const muted = usePlayerStore((state) => state.muted)
  const level = muted ? 0 : volume

  return (
    <ControlButton
      label={muted ? "Unmute (Shift+M)" : "Mute (Shift+M)"}
      onPress={actions.toggleMute}>
      {level === 0 ? (
        <VolumeOffIcon />
      ) : level <= 0.5 ? (
        <VolumeLowIcon />
      ) : (
        <VolumeIcon />
      )}
    </ControlButton>
  )
}
