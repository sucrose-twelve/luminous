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
 * Puts the player container in element fullscreen, then turns a phone to landscape (other devices refuse the
 * lock, which is ignored). Rejects without a user gesture. Callers check that `container.requestFullscreen`
 * exists first: Safari's prefixed API and the iPhone's video-only fullscreen are `useFullscreen`'s fallbacks.
 */
export async function requestContainerFullscreen(container: HTMLElement) {
  await container.requestFullscreen()
  const orientation = screen.orientation as LockableOrientation
  orientation.lock?.("landscape")?.catch(() => {})
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

    if (typeof container.requestFullscreen === "function") {
      requestContainerFullscreen(container).catch(() => {})
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
