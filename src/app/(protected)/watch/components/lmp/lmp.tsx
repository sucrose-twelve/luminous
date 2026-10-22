"use client"

import { LazyMotion, MotionConfig } from "framer-motion"
import { useCallback, useEffect, useRef } from "react"

import { PlayerStoreProvider, usePlayerStoreApi } from "@/stores/player"

import { useMobileFullscreen } from "./hooks/use-mobile-fullscreen"
import { LmpSession } from "./lmp-session"
import { PlayerFrame } from "./player-frame"
import { PlaylistDrawer } from "./playlist/playlist-drawer"
import type { LmpActions, LmpAdjacent, LmpHandoff, LmpProps } from "./types"

/**
 * framer-motion's animation code, fetched on its own after the player's (the `m` components render static
 * until it arrives).
 */
const loadMotionFeatures = () =>
  import("./motion-features").then((features) => features.default)

function LumineMediaPlayer(props: Readonly<LmpProps>) {
  const store = usePlayerStoreApi()
  const containerRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const handoffRef = useRef<LmpHandoff>({ playing: false, positions: new Map() })
  const actionsRef = useRef<LmpActions | null>(null)

  useMobileFullscreen(containerRef)

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

  return (
    <PlayerFrame ref={containerRef}>
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
      <PlaylistDrawer
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
  )
}

/**
 * The persistent part of the player, mounted once for the whole visit to `/watch`.
 *
 * It owns the container and the `<video>`, which must never be recreated: a new element closes
 * Picture-in-Picture and leaves fullscreen. Changing episode or audio track only changes `?vid=` / `?audio=`,
 * which keeps this component mounted, and swaps the `<LmpSession>` keyed by track. Everything the player
 * draws stays inside the container (the drawers included), so it all shows in fullscreen.
 *
 * Animations use framer-motion's `m` components under `LazyMotion`, which holds back the animation code; they
 * follow the system's reduced-motion setting (`MotionConfig`).
 */
export default function Lmp(props: Readonly<LmpProps>) {
  return (
    <PlayerStoreProvider>
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion='user'>
          <LumineMediaPlayer {...props} />
        </MotionConfig>
      </LazyMotion>
    </PlayerStoreProvider>
  )
}
