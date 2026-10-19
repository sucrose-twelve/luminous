import { useCallback, useSyncExternalStore, type RefObject } from "react"

/**
 * Reads a value from the `<video>`, re-rendering only when it changes after one of `events`.
 *
 * The video stays the source of truth; React keeps no copy. Return a primitive (or a stable string) from
 * `getSnapshot`, and round it to what the UI shows (`Math.floor(currentTime)`), so a component re-renders
 * once per visible change instead of on every event.
 *
 * @param videoRef - The player's `<video>`
 * @param events - Media events after which the value may change; pass a module-level constant
 * @param getSnapshot - Reads the value from the element
 * @param fallback - The value before the element exists
 *
 * @example
 * ```ts
 * const TIME_EVENTS = ["timeupdate", "seeking", "loadedmetadata"] as const
 * const seconds = useVideoEvent(videoRef, TIME_EVENTS, (video) => Math.floor(video.currentTime), 0)
 * ```
 */
export function useVideoEvent<T>(
  videoRef: RefObject<HTMLVideoElement | null>,
  events: readonly (keyof HTMLMediaElementEventMap)[],
  getSnapshot: (video: HTMLVideoElement) => T,
  fallback: T
) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const video = videoRef.current
      if (!video) return () => {}

      events.forEach((event) => video.addEventListener(event, onChange))
      return () => events.forEach((event) => video.removeEventListener(event, onChange))
    },
    [videoRef, events]
  )

  return useSyncExternalStore(
    subscribe,
    () => (videoRef.current ? getSnapshot(videoRef.current) : fallback),
    () => fallback
  )
}
