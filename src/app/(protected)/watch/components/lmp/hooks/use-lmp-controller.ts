import { clamp, throttle } from "es-toolkit"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react"

import type { Locales } from "@/constants/enum"

import type { LmpActions, LmpAdjacent, LmpHandoff, LmpProps, LmpStatus } from "../types"
import { useMediaSource } from "./use-media-source"
import {
  clearReloadPosition,
  readReloadPosition,
  useWatchProgress
} from "./use-watch-progress"

/**
 * Volume moves in 5 % steps, so repeated ±5 % never drifts into float noise (`0.30000000000000004`).
 */
const VOLUME_STEPS = 20

const SEEK_THROTTLE = 150

/**
 * Same rule as the server's `resolveStartAt`: a position this close to the end restarts the episode.
 */
const RESTART_TAIL = 10

/**
 * Owns one episode's playback: attaches the track through `useMediaSource`, follows the `<video>` events into
 * an `LmpStatus`, and exposes `LmpActions`, the only way the UI, shortcuts, and Media Session control the
 * player.
 *
 * @param videoRef - The persistent `<video>` owned by `<Lmp>`
 * @param handoffRef - What the previous session left: whether it was playing, and where it stopped
 * @param episodeId - The episode playing (`?vid=`), for switching its audio track
 * @param track - The track to play
 * @param startAt - Where playback starts, decided by the server. `?t=` in the URL always wins; without it, a
 * position this player left the same track at comes first (returning with the browser's Back restores the
 * page with the props it had), then the one this tab saved before a reload.
 */
export function useLmpController({
  videoRef,
  handoffRef,
  episodeId,
  track,
  startAt
}: Readonly<{
  videoRef: RefObject<HTMLVideoElement | null>
  handoffRef: RefObject<LmpHandoff>
  episodeId: string
  track: LmpProps["track"]
  startAt: number
}>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatusState] = useState<LmpStatus>("loading")
  const [isBlocked, setIsBlocked] = useState(false)
  const statusRef = useRef<LmpStatus>("loading")
  const pendingSeekRef = useRef<number | null>(null)
  const [initialAt] = useState(() => {
    if (searchParams.has("t")) return startAt
    return (
      handoffRef.current.positions.get(track.id) ??
      readReloadPosition(track.id) ??
      startAt
    )
  })
  const progress = useWatchProgress(videoRef, track.id, track.duration, initialAt)
  const { save: saveProgress, setSuppressed: setProgressSuppressed } = progress

  /**
   * Media event handlers read the status through the ref, so they don't resubscribe on every change.
   */
  const setStatus = useCallback((next: LmpStatus) => {
    statusRef.current = next
    setStatusState(next)
  }, [])

  /**
   * A refused `play()` (autoplay policy) leaves the player paused behind a big Play button. An `AbortError`
   * only means a `pause()` or a new source interrupted it.
   */
  const startPlayback = useCallback(
    (video: HTMLVideoElement) => {
      video.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          setIsBlocked(true)
          setStatus("paused")
        }
      })
    },
    [setStatus]
  )

  const handleReady = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    setStatus(video.paused ? "paused" : "playing")

    /**
     * `?t=` has done its job (audio switch, shared timestamp). Left in the URL, a reload would jump back to it
     * instead of resuming from the saved progress.
     */
    const url = new URL(window.location.href)
    if (url.searchParams.has("t")) {
      url.searchParams.delete("t")
      window.history.replaceState(null, "", url)
    }

    if (handoffRef.current.playing) {
      handoffRef.current.playing = false
      startPlayback(video)
    }
  }, [videoRef, handoffRef, setStatus, startPlayback])

  /**
   * Starts where this session last was (`initialAt` until it plays), so a session React re-shows continues
   * there. Too close to the end restarts the episode, as the server does.
   */
  const { lastTimeRef } = progress
  const readStartAt = useCallback(() => {
    const time = lastTimeRef.current
    return track.duration - time < RESTART_TAIL ? 0 : time
  }, [lastTimeRef, track.duration])

  const mse = useMediaSource(videoRef, {
    vid: track.id,
    ...track,
    startAt: readStartAt,
    onReady: handleReady
  })
  const { seekTo: mseSeekTo, stopBuffering, resumeBuffering } = mse

  /**
   * Relative seeks land on the element at most every `SEEK_THROTTLE` ms (leading and trailing): a held arrow
   * key repeats ~30 times a second, and each real seek aborts the MSE fetch in flight.
   */
  const throttledSeek = useMemo(() => throttle(mseSeekTo, SEEK_THROTTLE), [mseSeekTo])

  /**
   * Seeking out of `stopped` or `ended` lands paused at the new position, buffering and saving again.
   */
  const leaveStopped = useCallback(() => {
    if (statusRef.current === "stopped") {
      resumeBuffering()
      setProgressSuppressed(false)
    }
    if (statusRef.current === "stopped" || statusRef.current === "ended")
      setStatus("paused")
  }, [resumeBuffering, setProgressSuppressed, setStatus])

  const play = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (statusRef.current === "stopped") {
      resumeBuffering()
      setProgressSuppressed(false)
    }
    if (statusRef.current === "ended") video.currentTime = 0
    startPlayback(video)
  }, [videoRef, resumeBuffering, setProgressSuppressed, startPlayback])

  const pause = useCallback(() => videoRef.current?.pause(), [videoRef])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const isIdle =
      video.paused || statusRef.current === "stopped" || statusRef.current === "ended"
    if (isIdle) play()
    else video.pause()
  }, [videoRef, play])

  /**
   * Pause, rewind to `0:00`, stop fetching, and cover the video with the poster. The saved progress keeps the
   * position from before the stop.
   */
  const stop = useCallback(() => {
    const video = videoRef.current
    if (!video || statusRef.current === "stopped") return

    saveProgress()
    setProgressSuppressed(true)
    setStatus("stopped")
    setIsBlocked(false)
    video.pause()
    stopBuffering()
    throttledSeek.cancel()
    pendingSeekRef.current = null
    video.currentTime = 0
    if (document.pictureInPictureElement === video)
      document.exitPictureInPicture().catch(() => {})
  }, [
    videoRef,
    saveProgress,
    setProgressSuppressed,
    setStatus,
    stopBuffering,
    throttledSeek
  ])

  const seekTo = useCallback(
    (time: number) => {
      leaveStopped()
      throttledSeek.cancel()
      pendingSeekRef.current = null
      mseSeekTo(time)
    },
    [leaveStopped, throttledSeek, mseSeekTo]
  )

  /**
   * Adds to the pending target rather than `currentTime`, so presses faster than a seek completes still add
   * up. Stops just short of the end, so `ended` fires normally.
   */
  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current
      if (!video) return

      const base = pendingSeekRef.current ?? video.currentTime
      const target = clamp(base + delta, 0, Math.max(track.duration - 0.1, 0))
      leaveStopped()
      pendingSeekRef.current = target
      throttledSeek(target)
    },
    [videoRef, track.duration, leaveStopped, throttledSeek]
  )

  /**
   * Only the element changes; `<Lmp>` copies it into the store on `volumechange`.
   */
  const setVolume = useCallback(
    (volume: number) => {
      const video = videoRef.current
      if (!video) return

      const next = Math.round(clamp(volume, 0, 1) * VOLUME_STEPS) / VOLUME_STEPS
      video.volume = next
      if (next > 0 && video.muted) video.muted = false
    },
    [videoRef]
  )

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    if (!video.muted && video.volume === 0) video.volume = 0.5
  }, [videoRef])

  /**
   * Opens another episode in the target's audio language. `push` so the browser's Back returns to this one.
   * The next session plays on its own if this one was playing (or just finished).
   */
  const goTo = useCallback(
    (target: LmpAdjacent) => {
      const video = videoRef.current
      saveProgress()
      handoffRef.current.playing =
        (video ? !video.paused : false) || statusRef.current === "ended"
      router.push(`/watch?vid=${target.episodeId}&audio=${target.language}`, {
        scroll: false
      })
    },
    [videoRef, handoffRef, saveProgress, router]
  )

  /**
   * Swaps to another audio track of this episode at the same second. `replace`, because it's the same
   * episode: Back shouldn't step through audio changes.
   */
  const switchAudio = useCallback(
    (language: Locales) => {
      const video = videoRef.current
      saveProgress()
      handoffRef.current.playing = video ? !video.paused : false
      router.replace(
        `/watch?vid=${episodeId}&audio=${language}&t=${Math.floor(video?.currentTime ?? 0)}`,
        {
          scroll: false
        }
      )
    },
    [videoRef, handoffRef, episodeId, saveProgress, router]
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlaying = () => {
      setIsBlocked(false)
      setStatus("playing")
    }
    const handlePause = () => {
      if (statusRef.current === "playing" || statusRef.current === "buffering")
        setStatus("paused")
    }
    const handleWaiting = () => {
      if (statusRef.current === "playing") setStatus("buffering")
    }
    const handleEnded = () => setStatus("ended")
    /**
     * Only the seek to the latest target ends the chain; an earlier throttled seek finishing must not reset
     * the base that further presses add to.
     */
    const handleSeeked = () => {
      const pending = pendingSeekRef.current
      if (pending !== null && Math.abs(video.currentTime - pending) < 0.5)
        pendingSeekRef.current = null
    }

    video.addEventListener("playing", handlePlaying)
    video.addEventListener("pause", handlePause)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("seeked", handleSeeked)
    return () => {
      video.removeEventListener("playing", handlePlaying)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("seeked", handleSeeked)
    }
  }, [videoRef, setStatus])

  useEffect(() => () => throttledSeek.cancel(), [throttledSeek])

  /**
   * This track's left position has been read. On unmount, leave the current one for a later session of the
   * same track (Previous, or the browser's Back), unless it never loaded or was stopped.
   */
  useEffect(() => {
    const { positions } = handoffRef.current
    const { isLoadedRef } = progress
    positions.delete(track.id)
    clearReloadPosition(track.id)

    return () => {
      if (isLoadedRef.current && statusRef.current !== "stopped")
        positions.set(track.id, lastTimeRef.current)
    }
  }, [handoffRef, progress, lastTimeRef, track.id])

  const actions = useMemo<LmpActions>(
    () => ({
      play,
      pause,
      togglePlay,
      stop,
      seekTo,
      seekBy,
      setVolume,
      toggleMute,
      goTo,
      switchAudio
    }),
    [
      play,
      pause,
      togglePlay,
      stop,
      seekTo,
      seekBy,
      setVolume,
      toggleMute,
      goTo,
      switchAudio
    ]
  )

  return useMemo(
    () => ({
      status: mse.error ? ("error" as const) : status,
      error: mse.error,
      mode: mse.mode,
      isBlocked,
      actions
    }),
    [mse.error, mse.mode, status, isBlocked, actions]
  )
}
