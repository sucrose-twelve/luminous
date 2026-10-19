import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type RefObject
} from "react"

/**
 * Prefixed APIs still needed by Safari: element fullscreen on iPad / older macOS, and the native video
 * fullscreen that is the only option on iPhone.
 */
type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => void
}
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void }
type WebkitVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void }
type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>
}

const FULLSCREEN_EVENTS = ["fullscreenchange", "webkitfullscreenchange"] as const

function fullscreenElement() {
  const doc = document as WebkitDocument
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

function subscribe(onChange: () => void) {
  FULLSCREEN_EVENTS.forEach((event) => document.addEventListener(event, onChange))
  return () =>
    FULLSCREEN_EVENTS.forEach((event) => document.removeEventListener(event, onChange))
}

/**
 * Fullscreen for the whole player container, so the controls, OSD, and panels come along. The state is read
 * from the document, so fullscreen carried over from the previous episode shows correctly.
 *
 * Call `toggle` straight from a click or keydown: the browser requires a user gesture, so nothing may be
 * awaited before it.
 */
export function useFullscreen(
  containerRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>
) {
  const [isSupported] = useState(() => {
    const probe = document.createElement("video")
    return (
      document.fullscreenEnabled ||
      "webkitFullscreenElement" in document ||
      "webkitEnterFullscreen" in probe
    )
  })
  const isFullscreen = useSyncExternalStore(
    subscribe,
    () => containerRef.current !== null && fullscreenElement() === containerRef.current,
    () => false
  )

  const enter = useCallback(() => {
    const container = containerRef.current as WebkitElement | null
    const video = videoRef.current as WebkitVideo | null
    if (!container) return

    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {})

    if (container.requestFullscreen) {
      container
        .requestFullscreen()
        .then(() => (screen.orientation as LockableOrientation).lock?.("landscape"))
        .catch(() => {})
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen()
    } else {
      video?.webkitEnterFullscreen?.()
    }
  }, [containerRef, videoRef])

  const exit = useCallback(() => {
    const doc = document as WebkitDocument
    if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {})
    else doc.webkitExitFullscreen?.()
  }, [])

  const toggle = useCallback(() => {
    if (fullscreenElement()) exit()
    else enter()
  }, [enter, exit])

  return useMemo(
    () => ({ isSupported, isFullscreen, toggle, exit }),
    [isSupported, isFullscreen, toggle, exit]
  )
}
