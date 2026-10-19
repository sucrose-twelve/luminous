import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react"

import type { LmpActions, LmpAdjacent, LmpStatus } from "../types"
import { useVideoEvent } from "./use-video-event"

/**
 * How long the "Intro skipped · Undo" notice stays.
 */
const NOTICE_DURATION = 5_000

const RANGE_EVENTS = ["timeupdate", "seeking", "seeked", "loadedmetadata"] as const

export type SkipNotice = { id: number; skip: Content.Skip }

const skipKey = (skip: Content.Skip) => `${skip.kind}:${skip.from}`

/**
 * Follows the episode's skip ranges (intro, recap, outro): which one the playhead is in, for the Skip button,
 * and Auto Skip.
 *
 * Auto Skip only jumps a range that playback runs into, never one the viewer seeked into: they meant to be
 * there. Starting inside a range counts as running into it (an intro at `0:00`), and so does turning Auto
 * Skip on while in one. An intro or recap jumps to its end with an Undo notice; Undo goes back and leaves
 * that range alone for the rest of the session. An outro opens the next episode at once when Autoplay Next
 * is on and there is one in this language, otherwise it jumps to its end like the others (`notes` §8.4).
 *
 * @param skips - The episode's ranges, in seconds
 * @param duration - Track length, so a jump to an outro that runs to the end stops just short and ends
 * @param next - The next episode in this language, or `null`
 */
export function useSkips({
  videoRef,
  actions,
  status,
  skips,
  duration,
  next,
  autoSkip,
  autoplayNext
}: Readonly<{
  videoRef: RefObject<HTMLVideoElement | null>
  actions: LmpActions
  status: LmpStatus
  skips: Content.Skip[]
  duration: number
  next: LmpAdjacent | null
  autoSkip: boolean
  autoplayNext: boolean
}>) {
  const [notice, setNotice] = useState<SkipNotice | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const statusRef = useRef(status)
  const declinedRef = useRef(new Set<string>())
  const lastTickRef = useRef<number | null>(null)
  const isUserSeekRef = useRef(false)
  const isAutoSeekRef = useRef(false)
  const latestRef = useRef({ actions, skips, duration, next, autoSkip, autoplayNext })

  useEffect(() => {
    statusRef.current = status
    latestRef.current = { actions, skips, duration, next, autoSkip, autoplayNext }
  })

  const rangeIndex = useVideoEvent(
    videoRef,
    RANGE_EVENTS,
    (video) =>
      skips.findIndex(
        (skip) => skip.from <= video.currentTime && video.currentTime < skip.to
      ),
    -1
  )
  const range = rangeIndex === -1 ? null : (skips[rangeIndex] ?? null)

  const showNotice = useCallback((skip: Content.Skip) => {
    clearTimeout(noticeTimerRef.current)
    setNotice((current) => ({ id: (current?.id ?? 0) + 1, skip }))
    noticeTimerRef.current = setTimeout(() => setNotice(null), NOTICE_DURATION)
  }, [])

  const dismissNotice = useCallback(() => {
    clearTimeout(noticeTimerRef.current)
    setNotice(null)
  }, [])

  /**
   * Jumps to the end of a range, stopping just short of the track's end so `ended` fires normally.
   */
  const jumpPast = useCallback((skip: Content.Skip) => {
    const { actions: current, duration: length } = latestRef.current
    isAutoSeekRef.current = true
    current.seekTo(Math.min(skip.to, Math.max(length - 0.1, 0)))
  }, [])

  /**
   * The Skip button: an outro with a next episode opens it, anything else jumps to the range's end.
   */
  const skip = useCallback(() => {
    if (!range) return
    const { actions: current, next: target } = latestRef.current
    if (range.kind === "outro" && target) current.goTo(target)
    else current.seekTo(Math.min(range.to, Math.max(duration - 0.1, 0)))
  }, [range, duration])

  const undo = useCallback(() => {
    if (!notice) return
    declinedRef.current.add(skipKey(notice.skip))
    dismissNotice()
    latestRef.current.actions.seekTo(notice.skip.from)
  }, [notice, dismissNotice])

  /**
   * Turning Auto Skip on inside a range skips it at the next tick, as if playback had just entered it.
   */
  useEffect(() => {
    if (!autoSkip) return
    lastTickRef.current = null
    isUserSeekRef.current = false
  }, [autoSkip])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    /**
     * Seeks while the session loads (to the start position) aren't the viewer's. Neither is Auto Skip's own.
     */
    const handleSeeking = () => {
      lastTickRef.current = null
      if (isAutoSeekRef.current) isAutoSeekRef.current = false
      else if (statusRef.current !== "loading") isUserSeekRef.current = true
    }

    const handleTimeUpdate = () => {
      if (video.paused || video.seeking) return

      const time = video.currentTime
      const latest = latestRef.current
      const entered = latest.skips.find((item) => item.from <= time && time < item.to)
      const lastTick = lastTickRef.current
      lastTickRef.current = time

      if (!entered) {
        isUserSeekRef.current = false
        return
      }

      const isEntering = lastTick === null || lastTick < entered.from
      if (!isEntering || isUserSeekRef.current || !latest.autoSkip) return
      if (declinedRef.current.has(skipKey(entered))) return

      if (entered.kind === "outro" && latest.next && latest.autoplayNext) {
        latest.actions.goTo(latest.next)
        return
      }

      jumpPast(entered)
      showNotice(entered)
    }

    video.addEventListener("seeking", handleSeeking)
    video.addEventListener("timeupdate", handleTimeUpdate)
    return () => {
      video.removeEventListener("seeking", handleSeeking)
      video.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [videoRef, jumpPast, showNotice])

  useEffect(() => () => clearTimeout(noticeTimerRef.current), [])

  return useMemo(
    () => ({ range, notice, skip, undo, dismissNotice }),
    [range, notice, skip, undo, dismissNotice]
  )
}
