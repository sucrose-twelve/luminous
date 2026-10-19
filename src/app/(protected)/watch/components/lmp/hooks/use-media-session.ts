import { throttle } from "es-toolkit"
import { useEffect, useRef, type RefObject } from "react"

import type { LmpActions, LmpProps, LmpStatus } from "../types"

const POSITION_THROTTLE = 1_000

/**
 * Registers a Media Session handler, ignoring actions this browser doesn't know (it throws for those).
 */
function setHandler(
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null
) {
  try {
    navigator.mediaSession.setActionHandler(action, handler)
  } catch {
    /**
     * Unsupported action: the OS just won't show that control.
     */
  }
}

/**
 * Connects the episode to the OS media controls: keyboard media keys, the lock screen, Chrome's media hub,
 * and the buttons in the Picture-in-Picture window.
 *
 * Every handler goes through `LmpActions`, the same path as the on-screen buttons. Previous / next are only
 * offered when that episode exists. On unmount (episode change or leaving the page) everything is cleared, so
 * a stale handler never drives a dead session; the next session registers its own at once.
 *
 * @param title - The episode label shown by the OS, e.g. `S1 EP01 · Episode title`
 */
export function useMediaSession({
  videoRef,
  actions,
  status,
  title,
  episode,
  season,
  content,
  prev,
  next,
  duration
}: Readonly<{
  videoRef: RefObject<HTMLVideoElement | null>
  actions: LmpActions
  status: LmpStatus
  title: string
  episode: LmpProps["episode"]
  season: LmpProps["season"]
  content: LmpProps["content"]
  prev: LmpProps["prev"]
  next: LmpProps["next"]
  duration: number
}>) {
  const actionsRef = useRef(actions)
  const prevId = prev?.episodeId ?? null
  const nextId = next?.episodeId ?? null

  useEffect(() => {
    actionsRef.current = actions
  })

  useEffect(() => {
    if (!("mediaSession" in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: content.title,
      album:
        season.title ??
        (season.seasonNo === null ? content.title : `Season ${season.seasonNo}`),
      artwork: [
        { src: `/api/art/thumbnail/${episode.id}`, sizes: "640x360", type: "image/webp" },
        { src: `/api/art/poster/${season.id}`, sizes: "600x900", type: "image/webp" }
      ]
    })

    setHandler("play", () => actionsRef.current.play())
    setHandler("pause", () => actionsRef.current.pause())
    setHandler("stop", () => actionsRef.current.stop())
    setHandler("seekbackward", (details) =>
      actionsRef.current.seekBy(-(details.seekOffset ?? 10))
    )
    setHandler("seekforward", (details) =>
      actionsRef.current.seekBy(details.seekOffset ?? 10)
    )
    setHandler("seekto", (details) => actionsRef.current.seekTo(details.seekTime ?? 0))
    setHandler("previoustrack", prev ? () => actionsRef.current.goTo(prev) : null)
    setHandler("nexttrack", next ? () => actionsRef.current.goTo(next) : null)

    return () => {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = "none"
      const cleared: MediaSessionAction[] = [
        "play",
        "pause",
        "stop",
        "seekbackward",
        "seekforward",
        "seekto",
        "previoustrack",
        "nexttrack"
      ]
      cleared.forEach((action) => setHandler(action, null))
    }
  }, [
    title,
    episode.id,
    season.id,
    season.title,
    season.seasonNo,
    content.title,
    prevId,
    nextId
  ])

  /**
   * Keeps the OS scrubber in step: at once after metadata, a seek, or a rate change, and at most once a
   * second while playing. The position never exceeds the duration (the API throws).
   */
  useEffect(() => {
    const video = videoRef.current
    if (
      !video ||
      !("mediaSession" in navigator) ||
      !navigator.mediaSession.setPositionState
    )
      return

    const update = () => {
      const total =
        Number.isFinite(video.duration) && video.duration > 0 ? video.duration : duration
      try {
        navigator.mediaSession.setPositionState({
          duration: total,
          position: Math.min(Math.max(video.currentTime, 0), total),
          playbackRate: video.playbackRate || 1
        })
      } catch {
        /**
         * A transient state (duration not known yet) the next update corrects.
         */
      }
    }
    const throttledUpdate = throttle(update, POSITION_THROTTLE)
    const immediateEvents = ["loadedmetadata", "seeked", "ratechange"] as const

    immediateEvents.forEach((event) => video.addEventListener(event, update))
    video.addEventListener("timeupdate", throttledUpdate)
    return () => {
      throttledUpdate.cancel()
      immediateEvents.forEach((event) => video.removeEventListener(event, update))
      video.removeEventListener("timeupdate", throttledUpdate)
    }
  }, [videoRef, duration])

  useEffect(() => {
    if (!("mediaSession" in navigator)) return
    navigator.mediaSession.playbackState =
      status === "playing" || status === "buffering" ? "playing" : "paused"
  }, [status])
}
