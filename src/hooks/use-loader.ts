import { useMemo } from "react"

import { useMainStore as useStore } from "@/stores/main"

export function useLoader() {
  const setLoader = useStore((state) => state.setLoader)

  return useMemo(
    () => ({
      on: () => {
        setLoader(true)
        setTimeout(() => {
          setLoader(false)
        }, 5_000)
      },
      off: (delay: number = 200) => {
        setTimeout(() => {
          setLoader(false)
        }, delay)
      }
    }),
    [setLoader]
  )
}
