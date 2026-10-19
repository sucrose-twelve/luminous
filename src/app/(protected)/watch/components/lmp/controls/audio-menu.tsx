"use client"

import { Dropdown, Label, type Selection } from "@heroui/react"
import { MusicNote01Icon, Tick02Icon, TranslateIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, type RefObject } from "react"

import { cls } from "@/libs/utils"

import type { LmpAudioTrack } from "../types"
import { languageLabel } from "../utils"
import { ControlButton } from "./control-button"
import { PLAYER_MENU_ITEM, PlayerMenu } from "./player-menu"

/**
 * "Audio Tracks": its button, and every track of this episode, named in its own language, the playing one
 * checked.
 */
export function AudioMenu({
  tracks,
  currentId,
  anchorRef,
  isOpen,
  onOpenChange,
  onSelect
}: Readonly<{
  tracks: LmpAudioTrack[]
  currentId: string
  anchorRef: RefObject<HTMLElement | null>
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSelect: (track: LmpAudioTrack) => void
}>) {
  const handleSelectionChange = useCallback(
    (keys: Selection) => {
      if (keys === "all") return
      const track = tracks.find((item) => keys.has(item.id))
      if (track) onSelect(track)
    },
    [tracks, onSelect]
  )

  return (
    <PlayerMenu
      title='Audio Tracks'
      icon={MusicNote01Icon}
      align='start'
      anchorRef={anchorRef}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trigger={<ControlButton label='Audio tracks' icon={TranslateIcon} />}>
      <Dropdown.Menu
        aria-label='Audio Tracks'
        selectionMode='single'
        disallowEmptySelection
        selectedKeys={[currentId]}
        onSelectionChange={handleSelectionChange}
        className='gap-0 p-0'>
        {tracks.map((track) => (
          <Dropdown.Item
            key={track.id}
            id={track.id}
            textValue={languageLabel(track.language, track.isDubbed)}
            className={cls(
              PLAYER_MENU_ITEM,
              "text-white/60 data-[selected=true]:font-semibold data-[selected=true]:text-white"
            )}>
            {({ isSelected }) => (
              <>
                <Label lang={track.language}>
                  {languageLabel(track.language, track.isDubbed)}
                </Label>
                {isSelected && (
                  <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={1.5} />
                )}
              </>
            )}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </PlayerMenu>
  )
}
