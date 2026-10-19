"use client"

import { createContext, useContext, useRef, type ReactNode } from "react"
import { useStore } from "zustand"

import { createPlayerStore, type PlayerState, type PlayerStore } from "./state"

type Store = PlayerStore | null

const StoreContext = createContext<Store>(null)

export function PlayerStoreProvider({ children }: Readonly<{ children: ReactNode }>) {
  const storeRef = useRef<Store>(null)
  if (!storeRef.current) {
    storeRef.current = createPlayerStore()
  }

  return <StoreContext value={storeRef.current}>{children}</StoreContext>
}

/**
 * The store itself, for reading or writing from event handlers without subscribing the component.
 */
export function usePlayerStoreApi() {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error("usePlayerStore must be used within PlayerStoreProvider")
  }

  return store
}

export function usePlayerStore<T>(selector: (state: PlayerState) => T) {
  return useStore(usePlayerStoreApi(), selector)
}
