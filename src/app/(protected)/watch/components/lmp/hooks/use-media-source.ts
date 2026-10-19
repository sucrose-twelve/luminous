import { clamp, delay } from "es-toolkit"
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react"

import { findFragmentIndex } from "../utils"

/**
 * Seconds kept buffered ahead of and behind the playhead. Ahead is what survives a network hiccup; behind lets
 * a short rewind play without refetching, and everything older is evicted so a long episode stays under the
 * SourceBuffer quota.
 */
const BUFFER_AHEAD = 30
const BUFFER_BEHIND = 30

/**
 * Waits before each retry of a failed fragment fetch; after the last one the player falls back to native.
 */
const RETRY_DELAYS = [500, 1_500]

export type MediaSourceMode = "mse" | "native"
export type MediaSourceError = "unauthorized" | "playback"

type MediaSourceOptions = {
  vid: string
  mimeCodec: string
  duration: number
  initEnd: number
  fragments: Content.Fragment[]
  /**
   * Where to start, read each time the track is attached. A getter lets a session that React re-shows (the page
   * restored from history) continue where it was rather than where it first opened.
   */
  startAt: () => number
  /**
   * Called once per attach, when the video is positioned at `startAt` and can play.
   */
  onReady?: () => void
}

type Attachment = {
  stopBuffering: () => void
  resumeBuffering: () => void
  detach: () => void
}

/**
 * `index: null` is the init segment.
 */
type Operation =
  | { kind: "append"; data: ArrayBuffer; index: number | null }
  | { kind: "remove"; start: number; end: number }

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`)
  }
}

/**
 * Fetches an inclusive byte range of a track, retrying per `RETRY_DELAYS`. A `401` and an abort are not
 * retried.
 */
async function fetchRange(url: string, start: number, end: number, signal: AbortSignal) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Range: `bytes=${start}-${end}` },
        signal
      })
      if (!response.ok) throw new HttpError(response.status)
      return await response.arrayBuffer()
    } catch (error) {
      const isUnauthorized = error instanceof HttpError && error.status === 401
      if (signal.aborted || isUnauthorized || attempt >= RETRY_DELAYS.length) throw error
      await delay(RETRY_DELAYS[attempt], { signal })
    }
  }
}

/**
 * Seeks to `startAt` once metadata is in, then calls `onReady` the first time the video can play there.
 *
 * @returns A function that stops watching
 */
function watchReady(video: HTMLVideoElement, startAt: number, onReady: () => void) {
  const handleLoadedMetadata = () => {
    if (startAt > 0) video.currentTime = startAt
  }
  const handleCanPlay = () => {
    if (video.seeking || video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return
    stop()
    onReady()
  }
  const stop = () => {
    video.removeEventListener("loadedmetadata", handleLoadedMetadata)
    video.removeEventListener("canplay", handleCanPlay)
    video.removeEventListener("seeked", handleCanPlay)
  }

  video.addEventListener("loadedmetadata", handleLoadedMetadata)
  video.addEventListener("canplay", handleCanPlay)
  video.addEventListener("seeked", handleCanPlay)
  return stop
}

/**
 * Plays the whole file through `video.src`, relying on the stream route's Range support. Used when the browser
 * has no MSE for this codec, and as the fallback when MSE fails. There is nothing left to fall back to, so a
 * media error here is final.
 */
function attachNative(
  video: HTMLVideoElement,
  vid: string,
  startAt: number,
  events: { onReady: () => void; onError: () => void }
): Attachment {
  const stopWatching = watchReady(video, startAt, events.onReady)
  const handleError = () => {
    if (video.error) events.onError()
  }

  video.addEventListener("error", handleError)
  video.src = `/api/stream/${vid}`

  /**
   * The browser owns buffering in native mode, so Stop can only pause it.
   */
  return {
    stopBuffering: () => {},
    resumeBuffering: () => {},
    detach: () => {
      stopWatching()
      video.removeEventListener("error", handleError)
    }
  }
}

/**
 * Feeds a track to `video` through a MediaSource, one fragment at a time.
 *
 * Fetches fragments by byte range until `BUFFER_AHEAD` seconds past the playhead are buffered, evicts what is
 * more than `BUFFER_BEHIND` seconds behind, and on a seek aborts a fetch that is no longer needed. A fragment
 * counts as loaded when its midpoint is in `video.buffered`, so data the browser evicts by itself (Safari's
 * ManagedMediaSource does) is fetched again.
 *
 * `detach` leaves the element alone: the next session assigns its own `src`, which runs the load algorithm.
 */
function attachMediaSource(
  video: HTMLVideoElement,
  MediaSourceImpl: typeof MediaSource,
  source: Omit<MediaSourceOptions, "onReady" | "startAt"> & { startAt: number },
  events: { onReady: () => void; onFallback: () => void; onUnauthorized: () => void }
): Attachment {
  const { vid, mimeCodec, duration, initEnd, fragments, startAt } = source
  const url = `/api/stream/${vid}`
  const mediaSource = new MediaSourceImpl()
  const objectUrl = URL.createObjectURL(mediaSource)
  const queue: Operation[] = []
  const pending = new Set<number>()
  /**
   * Appended fragments `video.buffered` doesn't show: one track has no samples there, as in a dub whose audio
   * runs past the end of the picture. `buffered` is the intersection of the tracks, so they would be fetched
   * forever and the stream never ended; `endOfStream()` then extends the ranges over them.
   */
  const unbuffered = new Set<number>()

  let sourceBuffer: SourceBuffer | null = null
  let current: Operation | null = null
  let loading: { index: number | null; controller: AbortController } | null = null
  let isOpened = false
  let isInitAppended = false
  let isHalted = false
  let isDisposed = false

  const isBuffered = (time: number) => {
    const { buffered } = video
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= time && time < buffered.end(i)) return true
    }
    return false
  }

  const isPresent = (index: number) => {
    const fragment = fragments[index]
    return (
      pending.has(index) ||
      loading?.index === index ||
      unbuffered.has(index) ||
      isBuffered(fragment.time + fragment.duration / 2)
    )
  }

  const fail = (error: unknown) => {
    if (isDisposed) return
    isHalted = true
    if (error instanceof HttpError && error.status === 401) events.onUnauthorized()
    else events.onFallback()
  }

  const pump = () => {
    if (isDisposed || !sourceBuffer || sourceBuffer.updating) return

    const operation = queue.shift()
    if (!operation) return tick()

    current = operation
    try {
      if (operation.kind === "append") sourceBuffer.appendBuffer(operation.data)
      else sourceBuffer.remove(operation.start, operation.end)
    } catch (error) {
      current = null
      const isQuotaExceeded =
        error instanceof DOMException && error.name === "QuotaExceededError"
      if (!isQuotaExceeded || operation.kind !== "append") return fail(error)

      /**
       * Make room and retry the append; if nothing can be evicted, drop it and let a later tick refetch it.
       */
      const removals = makeRoom()
      if (removals.length) queue.unshift(...removals, operation)
      else if (operation.index !== null) pending.delete(operation.index)
      pump()
    }
  }

  const enqueue = (operation: Operation) => {
    queue.push(operation)
    pump()
  }

  /**
   * Removals up to the start of the fragment `seconds` behind the playhead, so whole fragments are dropped.
   */
  const removalBehind = (seconds: number): Operation | null => {
    const limit = video.currentTime - seconds
    if (limit <= 0 || !video.buffered.length) return null

    const end = fragments[findFragmentIndex(fragments, limit)].time
    return video.buffered.start(0) < end ? { kind: "remove", start: 0, end } : null
  }

  const evictBehind = () => {
    if (queue.some((operation) => operation.kind === "remove")) return
    const removal = removalBehind(BUFFER_BEHIND)
    if (removal) enqueue(removal)
  }

  /**
   * On a full quota, keep only a few seconds behind and nothing past the buffer-ahead window.
   */
  const makeRoom = () => {
    const removals: Operation[] = []
    const behind = removalBehind(5)
    if (behind) removals.push(behind)

    const ahead =
      fragments[findFragmentIndex(fragments, video.currentTime + BUFFER_AHEAD) + 1]
    const { buffered } = video
    if (ahead && buffered.length && buffered.end(buffered.length - 1) > ahead.time) {
      removals.push({ kind: "remove", start: ahead.time, end: Infinity })
    }
    return removals
  }

  const load = (index: number | null) => {
    const controller = new AbortController()
    const { start, end } =
      index === null ? { start: 0, end: initEnd - 1 } : fragments[index]
    loading = { index, controller }

    fetchRange(url, start, end, controller.signal)
      .then((data) => {
        if (isDisposed) return
        if (index !== null) pending.add(index)
        enqueue({ kind: "append", data, index })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) fail(error)
      })
      .finally(() => {
        if (loading?.controller === controller) loading = null
        tick()
      })
  }

  /**
   * Starts the next fetch, or ends the stream once every fragment up to the end is appended.
   */
  function tick() {
    if (isDisposed || isHalted || !sourceBuffer || !isInitAppended || loading) return

    const time = video.currentTime
    let index = findFragmentIndex(fragments, time)
    for (
      ;
      index < fragments.length && fragments[index].time < time + BUFFER_AHEAD;
      index++
    ) {
      if (!isPresent(index)) return load(index)
    }

    const isComplete = index >= fragments.length && !pending.size && !queue.length
    if (isComplete && !sourceBuffer.updating && mediaSource.readyState === "open")
      mediaSource.endOfStream()
  }

  const handleUpdateEnd = () => {
    if (current?.kind === "append") {
      if (current.index === null) isInitAppended = true
      else {
        const fragment = fragments[current.index]
        pending.delete(current.index)
        if (!isBuffered(fragment.time + fragment.duration / 2))
          unbuffered.add(current.index)
      }
    } else if (current?.kind === "remove") {
      const { start, end } = current
      unbuffered.forEach((index) => {
        if (fragments[index].time >= start && fragments[index].time < end)
          unbuffered.delete(index)
      })
    }
    current = null
    evictBehind()
    pump()
  }

  const handleSourceOpen = () => {
    isOpened = true
    URL.revokeObjectURL(objectUrl)

    try {
      mediaSource.duration = duration
      sourceBuffer = mediaSource.addSourceBuffer(mimeCodec)
    } catch (error) {
      return fail(error)
    }

    sourceBuffer.mode = "segments"
    sourceBuffer.addEventListener("updateend", handleUpdateEnd)
    load(null)
  }

  /**
   * Abort a fetch the new position no longer needs; the tick then loads from the new position.
   */
  const handleSeeking = () => {
    const time = video.currentTime
    if (loading && loading.index !== null) {
      const fragment = fragments[loading.index]
      const isNeeded =
        fragment.time + fragment.duration > time && fragment.time < time + BUFFER_AHEAD
      if (!isNeeded) {
        loading.controller.abort()
        loading = null
      }
    }
    tick()
  }

  const handleTimeUpdate = () => {
    evictBehind()
    tick()
  }

  const handleError = () => {
    if (video.error) fail(video.error)
  }

  const stopWatching = watchReady(video, startAt, events.onReady)
  mediaSource.addEventListener("sourceopen", handleSourceOpen, { once: true })
  video.addEventListener("seeking", handleSeeking)
  video.addEventListener("timeupdate", handleTimeUpdate)
  video.addEventListener("waiting", tick)
  video.addEventListener("error", handleError)

  /**
   * Required by ManagedMediaSource (iOS Safari), harmless elsewhere.
   */
  video.disableRemotePlayback = true
  video.src = objectUrl

  return {
    stopBuffering: () => {
      isHalted = true
      loading?.controller.abort()
      loading = null
    },
    resumeBuffering: () => {
      isHalted = false
      tick()
    },
    detach: () => {
      isDisposed = true
      stopWatching()
      mediaSource.removeEventListener("sourceopen", handleSourceOpen)
      sourceBuffer?.removeEventListener("updateend", handleUpdateEnd)
      video.removeEventListener("seeking", handleSeeking)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("waiting", tick)
      video.removeEventListener("error", handleError)
      loading?.controller.abort()
      queue.length = 0

      if (!isOpened) URL.revokeObjectURL(objectUrl)
      if (mediaSource.readyState === "open") {
        try {
          if (sourceBuffer?.updating) sourceBuffer.abort()
          mediaSource.endOfStream()
        } catch {
          /**
           * The source is being replaced either way; a failed close changes nothing.
           */
        }
      }
    }
  }
}

/**
 * Plays one track in the player's `<video>`: through a MediaSource when the browser supports the codec,
 * otherwise (or after MSE fails) through native `src`.
 *
 * Mount it in the per-episode session, which is keyed by track: the manifest of a `vid` never changes, so only
 * `vid` restarts the effect and the rest is read once.
 *
 * @param videoRef - The persistent `<video>` owned by `<Lmp>`
 * @param options - The track's manifest, where to start, and `onReady`
 */
export function useMediaSource(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: MediaSourceOptions
) {
  const [mode, setMode] = useState<MediaSourceMode>("mse")
  const [error, setError] = useState<MediaSourceError | null>(null)
  const attachmentRef = useRef<Attachment | null>(null)
  const optionsRef = useRef(options)
  const { vid, duration } = options

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current
      if (video) video.currentTime = clamp(time, 0, duration)
    },
    [videoRef, duration]
  )

  const stopBuffering = useCallback(() => attachmentRef.current?.stopBuffering(), [])
  const resumeBuffering = useCallback(() => attachmentRef.current?.resumeBuffering(), [])

  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const { mimeCodec, initEnd, fragments } = optionsRef.current
    const startAt = optionsRef.current.startAt()
    const MediaSourceImpl = window.ManagedMediaSource ?? window.MediaSource
    let isReady = false

    const handleReady = () => {
      if (isReady) return
      isReady = true
      optionsRef.current.onReady?.()
    }

    /**
     * Continues from where MSE stopped. If the browser refuses to resume playback, the player just stays
     * paused at that position.
     */
    const fallBackToNative = (time: number, shouldPlay: boolean) => {
      attachmentRef.current?.detach()
      setMode("native")
      attachmentRef.current = attachNative(video, vid, time, {
        onReady: () => {
          handleReady()
          if (shouldPlay) video.play().catch(() => {})
        },
        onError: () => setError("playback")
      })
    }

    if (!MediaSourceImpl?.isTypeSupported(mimeCodec)) {
      fallBackToNative(startAt, false)
    } else {
      attachmentRef.current = attachMediaSource(
        video,
        MediaSourceImpl,
        { vid, mimeCodec, duration, initEnd, fragments, startAt },
        {
          onReady: handleReady,
          onFallback: () => fallBackToNative(video.currentTime || startAt, !video.paused),
          onUnauthorized: () => setError("unauthorized")
        }
      )
    }

    return () => {
      attachmentRef.current?.detach()
      attachmentRef.current = null
    }
  }, [videoRef, vid, duration])

  return useMemo(
    () => ({ mode, error, seekTo, stopBuffering, resumeBuffering }),
    [mode, error, seekTo, stopBuffering, resumeBuffering]
  )
}
