import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react"

/**
 * Saves at least this often while playing, on top of the pause / seek / leave events.
 */
const SAVE_INTERVAL = 15_000

/**
 * A position within this many seconds of the last one sent isn't worth another request.
 */
const MIN_CHANGE = 1

const reloadKey = (trackId: string) => `lmp:position:${trackId}`

/**
 * Where this tab left a track when the page last unloaded, or `null`.
 *
 * On a reload, the unload beacon can reach the server after the new page already read the old progress, so
 * the player trusts this first. `sessionStorage` is per tab and survives a reload, which is exactly that case.
 */
export function readReloadPosition(trackId: string) {
  try {
    const position = Number(sessionStorage.getItem(reloadKey(trackId)))
    return Number.isFinite(position) && position > 0 ? position : null
  } catch {
    return null
  }
}

export function clearReloadPosition(trackId: string) {
  try {
    sessionStorage.removeItem(reloadKey(trackId))
  } catch {
    /**
     * Storage is blocked: there is nothing to clear.
     */
  }
}

/**
 * Saves where this episode is, with `navigator.sendBeacon` to `/api/progress`: every 15 s while playing, and on
 * pause, seek, end, hiding the tab, leaving the page, and unmount (another episode, or another route).
 *
 * A beacon outlives the page, which a Server Action doesn't. Nothing is sent before the track's metadata is in,
 * while `suppressed` (after Stop, so `0:00` doesn't overwrite the real position), or when the position hasn't
 * moved. Everything is tied to this session, so no beacon for an old track follows an episode change.
 *
 * @param startAt - The position the episode opened at, which is already saved
 */
export function useWatchProgress(
  videoRef: RefObject<HTMLVideoElement | null>,
  trackId: string,
  duration: number,
  startAt: number
) {
  const lastSentRef = useRef(startAt)
  const lastTimeRef = useRef(startAt)
  const isLoadedRef = useRef(false)
  const isSuppressedRef = useRef(false)

  const send = useCallback(
    (position: number) => {
      if (!isLoadedRef.current || isSuppressedRef.current) return
      if (Math.abs(position - lastSentRef.current) < MIN_CHANGE) return

      lastSentRef.current = position
      const body = new Blob([JSON.stringify({ trackId, position })], {
        type: "application/json"
      })
      navigator.sendBeacon("/api/progress", body)
    },
    [trackId]
  )

  /**
   * Saves the current position now. Reads the last `timeupdate` rather than the element, which may already
   * hold another source when this runs during an unmount.
   */
  const save = useCallback(() => send(lastTimeRef.current), [send])

  const setSuppressed = useCallback((isSuppressed: boolean) => {
    isSuppressedRef.current = isSuppressed
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let interval: ReturnType<typeof setInterval> | undefined
    const stopInterval = () => clearInterval(interval)

    const handleLoadedMetadata = () => {
      isLoadedRef.current = true
    }
    const handleTimeUpdate = () => {
      lastTimeRef.current = video.currentTime
    }
    const handlePlaying = () => {
      stopInterval()
      interval = setInterval(save, SAVE_INTERVAL)
    }
    const handlePause = () => {
      stopInterval()
      save()
    }
    const handleSeeked = () => {
      lastTimeRef.current = video.currentTime
      save()
    }
    const handleEnded = () => {
      stopInterval()
      lastTimeRef.current = duration
      save()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") save()
    }
    const handlePageHide = () => {
      save()
      if (!isLoadedRef.current || isSuppressedRef.current) return
      try {
        sessionStorage.setItem(reloadKey(trackId), String(lastTimeRef.current))
      } catch {
        /**
         * Storage is blocked: a reload falls back to the saved progress.
         */
      }
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("playing", handlePlaying)
    video.addEventListener("pause", handlePause)
    video.addEventListener("seeked", handleSeeked)
    video.addEventListener("ended", handleEnded)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)
    return () => {
      save()
      stopInterval()
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("playing", handlePlaying)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("seeked", handleSeeked)
      video.removeEventListener("ended", handleEnded)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handlePageHide)
    }
  }, [videoRef, trackId, duration, save])

  return useMemo(
    () => ({ save, setSuppressed, lastTimeRef, isLoadedRef }),
    [save, setSuppressed]
  )
}
