"use client"

import dynamic from "next/dynamic"
import { createContext, useContext, useRef, type ReactNode } from "react"
import { useStore } from "zustand"

import { APP_VERSION } from "@/constants"
import { Locales, Theme } from "@/constants/enum"

import { createMainStore, type MainState, type MainStore } from "./state"

type Store = MainStore | null

const StoreContext = createContext<Store>(null)

const LoaderObserver = dynamic(() => import("@/components/loader"), {
  ssr: false
})

export function MainStoreProvider({
  children,
  account
}: Readonly<{
  children: ReactNode
  account?: unknown
}>) {
  const storeRef = useRef<Store>(null)
  if (!storeRef.current) {
    storeRef.current = createMainStore({
      appVersion: `${APP_VERSION} (Oct, 2026)`,
      locale: Locales.US,
      theme: Theme.DARK,
      loader: true
    })
  }

  return (
    <StoreContext value={storeRef.current}>
      <LoaderObserver />
      {children}
    </StoreContext>
  )
}

export function useMainStore<T>(selector: (state: MainState) => T) {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error("useStore must be used within StoreProvider")
  }

  return useStore(store, selector)
}
