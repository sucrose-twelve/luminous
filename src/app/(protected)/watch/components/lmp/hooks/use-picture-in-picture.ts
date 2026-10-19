import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type RefObject
} from "react"

/**
 * Picture-in-Picture for the player's `<video>`. The state is read from the document, so PiP carried over
 * from the previous episode (same element) shows correctly.
 *
 * Firefox has no `requestPictureInPicture()`, so `isSupported` is `false` there. Call `toggle` straight from a
 * click or keydown: the browser requires a user gesture.
 *
 * @returns `toggle` resolves to `false` when the browser refused
 */
export function usePictureInPicture(videoRef: RefObject<HTMLVideoElement | null>) {
  const [isSupported] = useState(() => document.pictureInPictureEnabled === true)

  const subscribe = useCallback(
    (onChange: () => void) => {
      const video = videoRef.current
      if (!video) return () => {}

      video.addEventListener("enterpictureinpicture", onChange)
      video.addEventListener("leavepictureinpicture", onChange)
      return () => {
        video.removeEventListener("enterpictureinpicture", onChange)
        video.removeEventListener("leavepictureinpicture", onChange)
      }
    },
    [videoRef]
  )
  const isActive = useSyncExternalStore(
    subscribe,
    () =>
      videoRef.current !== null && document.pictureInPictureElement === videoRef.current,
    () => false
  )

  /**
   * Leaves fullscreen first: a video can't be in both, and the gesture is still valid right after.
   */
  const toggle = useCallback(async () => {
    const video = videoRef.current
    if (!video || !isSupported || video.disablePictureInPicture) return false

    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture()
      } else {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        await video.requestPictureInPicture()
      }
      return true
    } catch {
      return false
    }
  }, [videoRef, isSupported])

  return useMemo(
    () => ({ isSupported, isActive, toggle }),
    [isSupported, isActive, toggle]
  )
}
