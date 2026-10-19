"use client"

import { useCallback, useEffect, useRef } from "react"
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider"

import { cls } from "@/libs/utils"
import { PlayerStoreProvider, usePlayerStore, usePlayerStoreApi } from "@/stores/player"

import { LmpSession } from "./lmp-session"
import { PlayerFrame } from "./player-frame"
import { PlaylistPanel } from "./playlist/playlist-panel"
import type { LmpActions, LmpAdjacent, LmpHandoff, LmpProps } from "./types"

function LumineMedeaPlayer(props: Readonly<LmpProps>) {
  const store = usePlayerStoreApi()
  const isPlaylistOpen = usePlayerStore((state) => state.playlistOpen)
  const containerRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const handoffRef = useRef<LmpHandoff>({ playing: false, positions: new Map() })
  const actionsRef = useRef<LmpActions | null>(null)

  /**
   * Restore this device's volume, then mirror every change back into the store, whatever made it (the
   * player, the OS, the PiP window).
   */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const { volume, muted, setVolume, setMuted } = store.getState()
    video.volume = volume
    video.muted = muted

    const handleVolumeChange = () => {
      setVolume(video.volume)
      setMuted(video.muted)
    }
    video.addEventListener("volumechange", handleVolumeChange)
    return () => video.removeEventListener("volumechange", handleVolumeChange)
  }, [store])

  /**
   * Leaving the watch page: close PiP (it would otherwise outlive the page) and release the media resource.
   */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    return () => {
      if (document.pictureInPictureElement === video)
        document.exitPictureInPicture().catch(() => {})
      video.removeAttribute("src")
      video.load()
    }
  }, [])

  /**
   * The playlist outlives sessions, so it reaches the current one's `goTo` (which saves progress and hands
   * over playback) through a ref.
   */
  const selectEpisode = useCallback(
    (target: LmpAdjacent) => actionsRef.current?.goTo(target),
    []
  )

  /**
   * HeroUI overlays (menus, tooltips, the season select, the shortcut list) portal to `<body>` by default,
   * which the browser doesn't paint while the player is fullscreen. They go into the container instead.
   */
  const getPortalContainer = useCallback(() => containerRef.current, [])

  return (
    <UNSAFE_PortalProvider getContainer={getPortalContainer}>
      <PlayerFrame ref={containerRef} className='flex portrait:flex-col'>
        <div
          className={cls(
            "relative min-h-0 w-full flex-1",
            isPlaylistOpen && "max-lg:portrait:aspect-video max-lg:portrait:flex-none"
          )}>
          <video
            ref={videoRef}
            className='size-full object-contain'
            playsInline
            preload='metadata'
          />
          <LmpSession
            key={props.track.id}
            {...props}
            containerRef={containerRef}
            videoRef={videoRef}
            handoffRef={handoffRef}
            actionsRef={actionsRef}
          />
        </div>
        <PlaylistPanel
          playlist={props.playlist}
          contentTitle={props.content.title}
          current={{
            episodeId: props.episode.id,
            seasonId: props.season.id,
            language: props.track.language,
            isDubbed: props.track.isDubbed
          }}
          onSelect={selectEpisode}
        />
      </PlayerFrame>
    </UNSAFE_PortalProvider>
  )
}

/**
 * The persistent part of the player, mounted once for the whole visit to `/watch`.
 *
 * It owns the container and the `<video>`, which must never be recreated: a new element closes
 * Picture-in-Picture and leaves fullscreen. Changing episode or audio track only changes `?vid=` / `?audio=`, which keeps
 * this component mounted, and swaps the `<LmpSession>` keyed by track.
 */
export default function Lmp(props: Readonly<LmpProps>) {
  return (
    <PlayerStoreProvider>
      <LumineMedeaPlayer {...props} />
    </PlayerStoreProvider>
  )
}
