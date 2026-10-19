import { addSeconds, intervalToDuration } from "date-fns"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * @param duration unit in second
 */
export function useCountdownTimer(duration: number = 60) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const [remainingTime, setRemainingTime] = useState<number>(duration)
  const [isActive, setIsActive] = useState<boolean>(true)
  const [isPaused, setIsPaused] = useState<boolean>(false)

  const start = useCallback(() => {
    setIsActive(true)
    setIsPaused(false)
    setRemainingTime(duration)
  }, [])

  const pause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    setIsPaused(false)
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    setIsActive(false)
    setIsPaused(false)
    setRemainingTime(duration)
  }, [])

  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev > 0) {
            return prev - 1
          } else {
            clearInterval(intervalRef.current!)
            console.log("Time's up!")
            return 0
          }
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isActive, isPaused])

  return useMemo(() => {
    const duration = intervalToDuration({
      start: new Date(),
      end: addSeconds(new Date(), remainingTime)
    })

    return {
      duration: {
        years: 0,
        months: 0,
        weeks: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        ...duration
      } as CountdownDuration,
      remainingTime,
      start,
      pause,
      resume,
      stop
    }
  }, [remainingTime])
}
