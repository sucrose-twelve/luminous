import { useEffect, useState, type RefObject } from "react"

/**
 * How long the browser may put off the preload while busy, and the delay used where `requestIdleCallback`
 * doesn't exist (Safari).
 */
const IDLE_TIMEOUT = 2_000
const FALLBACK_DELAY = 300

/**
 * Preloads the episode's sprite sheet for the progress bar's hover preview, once the video can play, so it
 * never competes with the first video fragments.
 *
 * The image is fetched at low priority when the browser is idle and decoded ahead, so the first hover paints
 * at once from the memory cache. Until it is ready (or when the episode has no sprite sheet) the preview shows
 * only the time.
 *
 * @param src - `/api/art/sprite/<episodeId>`
 * @param hasSprite - Whether the episode has a sprite sheet (`spriteGrid !== null`)
 * @returns Whether the sheet is loaded and decoded
 */
export function useSpritePreview(
  videoRef: RefObject<HTMLVideoElement | null>,
  src: string,
  hasSprite: boolean
) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasSprite) return

    let isCancelled = false
    let idle: number | undefined
    let timer: ReturnType<typeof setTimeout> | undefined

    const preload = () => {
      const image = new Image()
      image.fetchPriority = "low"
      image.src = src
      image
        .decode()
        .then(() => {
          if (!isCancelled) setIsReady(true)
        })
        .catch(() => {
          /**
           * A missing or broken sheet leaves the preview showing the time only.
           */
        })
    }
    const schedule = () => {
      if ("requestIdleCallback" in window)
        idle = requestIdleCallback(preload, { timeout: IDLE_TIMEOUT })
      else timer = setTimeout(preload, FALLBACK_DELAY)
    }

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) schedule()
    else video.addEventListener("canplay", schedule, { once: true })

    return () => {
      isCancelled = true
      video.removeEventListener("canplay", schedule)
      if (idle !== undefined) cancelIdleCallback(idle)
      clearTimeout(timer)
    }
  }, [videoRef, src, hasSprite])

  return isReady
}
