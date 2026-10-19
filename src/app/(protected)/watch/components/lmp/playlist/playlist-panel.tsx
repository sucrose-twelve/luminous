"use client"

import { ListBox, Select, useOverlayState, type Key } from "@heroui/react"
import { ListVideoIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { useMedia } from "react-use"

import { DrawerComponent } from "@/components/ui/drawer"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import type { Locales } from "@/constants/enum"
import { seasonName } from "@/libs/season"
import { cls } from "@/libs/utils"
import { usePlayerStore } from "@/stores/player"

import { PLAYLIST_PANEL_ID, PlaylistButton } from "../controls/playlist-button"
import type { LmpAdjacent, LmpProps } from "../types"
import { languageLabel } from "../utils"
import { PlaylistItem, type PlaylistEpisode } from "./playlist-item"

/**
 * Where the playlist opens as a drawer instead of the inline panel: Tailwind's `lg`, which the player's layout
 * classes for the inline panel (`max-lg:`) follow too.
 */
const DRAWER_QUERY = "(min-width: 64rem)"

type PlaylistPanelProps = {
  playlist: LmpProps["playlist"]
  /**
   * The content's title, which names each episode card unless the season has a title of its own
   */
  contentTitle: string
  /**
   * The episode and audio being played
   */
  current: { episodeId: string; seasonId: string; language: Locales; isDubbed: boolean }
  /**
   * Opens an episode in the language being played (the server falls back when the episode lacks it)
   */
  onSelect: (target: LmpAdjacent) => void
}

/**
 * The episode list, the only one on the watch page. Open while the player store's `playlistOpen` is set, and
 * rendered by the persistent `<Lmp>`, so it stays open when an episode is picked.
 *
 * - Desktop (`lg` and up): the app's `DrawerComponent` from the right, over the player. A modal: it closes with
 *   its Close button, the Playlist shortcut keys, or Escape (from the session), not a click outside.
 * - Mobile: the inline panel (`docs/design/02-Playlist.png`), over the right of the player in landscape and
 *   below it in portrait. Not a modal: a click on the video doesn't close it. Escape closes it from the
 *   session, after any menu in front of it.
 *
 * Either way the player's shortcuts keep working while it's open.
 */
export function PlaylistPanel(props: Readonly<PlaylistPanelProps>) {
  const isOpen = usePlayerStore((state) => state.playlistOpen)
  const setPlaylistOpen = usePlayerStore((state) => state.setPlaylistOpen)
  const isDrawer = useMedia(DRAWER_QUERY, false)
  const control = useOverlayState({
    isOpen: isOpen && isDrawer,
    onOpenChange: setPlaylistOpen
  })

  if (isDrawer) {
    return (
      <DrawerComponent control={control}>
        <PlaylistContent {...props} layout='drawer' onClose={control.close} />
      </DrawerComponent>
    )
  }

  return isOpen ? <PlaylistContent {...props} layout='panel' /> : null
}

/**
 * The open list. Mounting it fresh on each open starts it on the playing episode's season.
 */
function PlaylistContent({
  playlist,
  contentTitle,
  current,
  layout,
  onSelect,
  onClose
}: Readonly<
  PlaylistPanelProps & {
    layout: "drawer" | "panel"
    /**
     * Closes the drawer from its footer; the panel closes with its own Playlist button
     */
    onClose?: () => void
  }
>) {
  const titleId = useId()
  const listRef = useRef<HTMLOListElement>(null)
  const [seasonId, setSeasonId] = useState(current.seasonId)
  const [shownSeasonId, setShownSeasonId] = useState(current.seasonId)
  const season = playlist.seasons.find((item) => item.id === seasonId)
  const cardTitle = season?.title ?? contentTitle
  const missingAudio = `No ${languageLabel(current.language, true)} audio`

  /**
   * Follows the playing episode into its season when that changes (Next from a season's last episode); a
   * season picked by hand stays until then.
   */
  if (shownSeasonId !== current.seasonId) {
    setShownSeasonId(current.seasonId)
    setSeasonId(current.seasonId)
  }

  const episodes = useMemo(
    () => playlist.episodes.filter((episode) => episode.seasonId === seasonId),
    [playlist.episodes, seasonId]
  )

  const selectSeason = useCallback((value: Key | Key[] | null) => {
    if (typeof value === "string") setSeasonId(value)
  }, [])

  const selectEpisode = useCallback(
    (episode: PlaylistEpisode) => {
      if (!season) return
      onSelect({
        episodeId: episode.id,
        language: current.language,
        isDubbed: current.isDubbed,
        episodeNo: episode.episodeNo,
        kind: episode.kind,
        seasonKind: season.kind,
        seasonNo: season.seasonNo,
        title: episode.title
      })
    },
    [season, current.language, current.isDubbed, onSelect]
  )

  /**
   * Brings the playing episode into view on open and when it changes; another season starts at its top.
   */
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector("[aria-current=true]")
    if (item) item.scrollIntoView({ block: "nearest" })
    else list?.scrollTo({ top: 0 })
  }, [current.episodeId, seasonId])

  const seasonSelect =
    playlist.seasons.length > 1 ? (
      <Select
        aria-label='Season'
        className='w-auto'
        value={seasonId}
        onChange={selectSeason}>
        <Select.Trigger className='data-[focus-visible=true]:ring-theme h-auto min-h-0 gap-2 rounded-md bg-white/10 py-1.5 pr-2 pl-3 text-sm text-white shadow-none data-[hovered=true]:bg-white/15'>
          <Select.Value className='text-white' />
          <Select.Indicator className='text-white' />
        </Select.Trigger>
        <Select.Popover className='rounded-md bg-neutral-900/95 text-white shadow-lg ring-1 shadow-black/50 ring-white/10 backdrop-blur-md'>
          <ListBox>
            {playlist.seasons.map((item) => (
              <ListBox.Item
                key={item.id}
                id={item.id}
                textValue={seasonName(item)}
                className='data-[focus-visible=true]:ring-theme rounded-sm text-white data-[hovered=true]:bg-white/10'>
                {seasonName(item)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    ) : null

  const list = (
    <ol
      ref={listRef}
      className={cls(
        "flex min-h-0 grow flex-col gap-4 overflow-y-auto overscroll-contain",
        layout === "drawer" ? "px-4 py-6 sm:px-8" : "p-4 sm:px-6"
      )}>
      {episodes.map((episode) => (
        <PlaylistItem
          key={episode.id}
          episode={episode}
          title={cardTitle}
          isMovie={season?.kind === "movie"}
          isCurrent={episode.id === current.episodeId}
          missingAudio={
            episode.audios.some((audio) => audio.language === current.language)
              ? null
              : missingAudio
          }
          onSelect={selectEpisode}
        />
      ))}
    </ol>
  )

  if (layout === "drawer") {
    return (
      <nav
        id={PLAYLIST_PANEL_ID}
        aria-label='Playlist'
        className='flex h-full w-full flex-col sm:w-120'>
        <ContentHeader
          icon={
            <HugeiconsIcon
              className='size-6 stroke-2 text-zinc-400'
              icon={ListVideoIcon}
            />
          }
          title='playlist'
          description={contentTitle}
        />
        {seasonSelect ? <div className='px-4 pt-4 sm:px-8'>{seasonSelect}</div> : null}
        {list}
        <ContentFooter onClose={onClose} />
      </nav>
    )
  }

  return (
    <nav
      id={PLAYLIST_PANEL_ID}
      aria-labelledby={titleId}
      className='landscape:motion-safe:animate-slide-in-right flex min-h-0 w-full flex-1 flex-col bg-neutral-950 text-white landscape:absolute landscape:inset-y-0 landscape:right-0 landscape:w-[clamp(320px,25%,480px)] landscape:bg-neutral-950/95 landscape:backdrop-blur-md'>
      <header className='mx-4 flex items-center gap-2 border-b border-white/15 pt-3 pb-2 sm:mx-6 landscape:pt-4 sm:landscape:pt-5'>
        <PlaylistButton label='Close playlist' className='-ml-2.5' />
        <h2 id={titleId} className='grow text-lg font-medium'>
          Playlist
        </h2>
        {seasonSelect}
      </header>
      {list}
    </nav>
  )
}
