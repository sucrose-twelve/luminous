"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { ListVideoIcon } from "@/components/icons"
import type { Locales } from "@/constants/enum"
import { seasonName } from "@/libs/season"
import { cls } from "@/libs/utils"
import { usePlayerStore } from "@/stores/player"

import { PLAYLIST_DRAWER_ID } from "../controls/playlist-button"
import { Drawer } from "../overlays/drawer"
import type { LmpAdjacent, LmpProps } from "../types"
import { languageLabel } from "../utils"
import { PlaylistItem, type PlaylistEpisode } from "./playlist-item"

type PlaylistDrawerProps = {
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
 * The episode list, the only one on the watch page, in the player's `Drawer` (from the right on a desktop,
 * from the bottom on a phone). Open while the player store's `playlistOpen` is set, and rendered by the
 * persistent `<Lmp>`, so it stays open when an episode is picked. The player's shortcuts keep working while
 * it's open.
 */
export function PlaylistDrawer(props: Readonly<PlaylistDrawerProps>) {
  const isOpen = usePlayerStore((state) => state.playlistOpen)
  const setPlaylistOpen = usePlayerStore((state) => state.setPlaylistOpen)

  const close = useCallback(() => setPlaylistOpen(false), [setPlaylistOpen])

  return (
    <Drawer
      id={PLAYLIST_DRAWER_ID}
      isOpen={isOpen}
      onClose={close}
      title='Playlist'
      description={props.contentTitle}
      icon={<ListVideoIcon />}>
      <PlaylistContent {...props} />
    </Drawer>
  )
}

/**
 * The open list. Mounting it fresh on each open starts it on the playing episode's season.
 */
function PlaylistContent({
  playlist,
  contentTitle,
  current,
  onSelect
}: Readonly<PlaylistDrawerProps>) {
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
   * Scrolls the list alone: `scrollIntoView` would also scroll the player's clipped boxes toward a drawer
   * that is still sliding in.
   */
  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const item = list.querySelector<HTMLElement>("[aria-current=true]")
    if (!item) {
      list.scrollTo({ top: 0 })
      return
    }

    const top = item.offsetTop
    const bottom = top + item.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight
  }, [current.episodeId, seasonId])

  return (
    <>
      {playlist.seasons.length > 1 && (
        <div
          role='group'
          aria-label='Season'
          className='flex shrink-0 [scrollbar-width:none] gap-2 overflow-x-auto p-4'>
          {playlist.seasons.map((item) => {
            const isShown = item.id === seasonId
            return (
              <button
                key={item.id}
                type='button'
                aria-pressed={isShown}
                onClick={() => setSeasonId(item.id)}
                className={cls(
                  "border-gradient shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                  isShown
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/80 hover:bg-white/15 focus-visible:bg-white/15"
                )}>
                {seasonName(item)}
              </button>
            )
          })}
        </div>
      )}
      <ol
        ref={listRef}
        aria-label={season ? seasonName(season) : "Episodes"}
        className='relative flex min-h-0 grow [scrollbar-width:none] flex-col gap-1 overflow-y-auto overscroll-contain p-4'>
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
    </>
  )
}
