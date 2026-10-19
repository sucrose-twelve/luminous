import { useCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * How long the end card counts down before the next episode opens.
 */
export const AUTOPLAY_COUNTDOWN = 5_000

/**
 * The Autoplay Next countdown on the end card: while `isArmed`, opens the next episode after
 * `AUTOPLAY_COUNTDOWN`, unless cancelled.
 *
 * One `setTimeout` to a deadline, not an interval counting ticks, so a throttled background tab or a PiP
 * window still moves on in time. The card draws its ring from `deadline`. Disarming (Replay, a seek back,
 * Stop) clears both the timer and a cancel, so the next ending counts again.
 *
 * @param isArmed - The episode has ended, Autoplay Next is on, and there is a next episode in this language
 * @param onExpire - Opens the next episode
 * @returns `deadline` (epoch ms) while counting, else `null`
 */
export function useAutoplayNext(isArmed: boolean, onExpire: () => void) {
  const [isCancelled, setIsCancelled] = useState(false)
  const [wasArmed, setWasArmed] = useState(isArmed)
  const [deadline, setDeadline] = useState<number | null>(null)
  const onExpireRef = useRef(onExpire)
  const isCounting = isArmed && !isCancelled

  useEffect(() => {
    onExpireRef.current = onExpire
  })

  if (wasArmed !== isArmed) {
    setWasArmed(isArmed)
    if (!isArmed) setIsCancelled(false)
  }

  useEffect(() => {
    if (!isCounting) return

    setDeadline(Date.now() + AUTOPLAY_COUNTDOWN)
    const timer = setTimeout(() => onExpireRef.current(), AUTOPLAY_COUNTDOWN)
    return () => {
      clearTimeout(timer)
      setDeadline(null)
    }
  }, [isCounting])

  const cancel = useCallback(() => setIsCancelled(true), [])

  return useMemo(() => ({ deadline, cancel }), [deadline, cancel])
}
