"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { useLoader, useStore } from "@/hooks"
import { cls } from "@/libs/utils"

function Component() {
  const loader = useStore((state) => state.loader)
  const [visible, setVisible] = useState<boolean>(false)

  const breakAllKeyboardEvents = useCallback((e: KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  useEffect(() => {
    if (loader) {
      setVisible(true)
      addEventListener("keydown", breakAllKeyboardEvents)
    } else {
      setTimeout(() => setVisible(false), 200)
      removeEventListener("keydown", breakAllKeyboardEvents)
    }

    return () => {
      removeEventListener("keydown", breakAllKeyboardEvents)
    }
  }, [loader])

  if (!visible) return null
  return (
    <div className='fixed inset-0 z-999'>
      <div
        className={cls(
          "animate-loader pointer-events-none h-0.5 max-w-full",
          'before:absolute before:inset-x-0 before:top-0 before:bottom-auto before:h-0.5 before:bg-white/20 before:content-[""]',
          "max-sm:before:top-auto max-sm:before:bottom-0"
        )}>
        <div
          className='animate-rainbow relative h-full bg-size-[200%]'
          style={{ backgroundImage: "var(--color-rainbow)" }}
        />
      </div>
    </div>
  )
}

function Loading() {
  const loader = useLoader()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname || searchParams) loader.off()
  }, [pathname, searchParams])

  return null
}

export default function LoaderObserver() {
  return (
    <>
      <Loading />
      <Component />
    </>
  )
}
