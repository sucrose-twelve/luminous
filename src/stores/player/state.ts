import { clamp } from "es-toolkit"
import { createStore } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type State = {
  volume: number
  muted: boolean
  playlistOpen: boolean
}

type Actions = {
  setVolume: (volume: State["volume"]) => void
  setMuted: (muted: State["muted"]) => void
  setPlaylistOpen: (playlistOpen: State["playlistOpen"]) => void
}

export type PlayerState = State & Actions

const INITIAL_STATE: State = { volume: 1, muted: false, playlistOpen: false }

/**
 * Per-device player settings. `volume` and `muted` persist in `localStorage` (`lmp:player`); `playlistOpen`
 * lives only while the watch page is open.
 *
 * Without `localStorage` (blocked storage, some private modes) the store still works, in memory.
 */
export const createPlayerStore = () =>
  createStore<PlayerState>()(
    persist(
      (setState) => ({
        ...INITIAL_STATE,
        setVolume: (volume) => setState({ volume }),
        setMuted: (muted) => setState({ muted }),
        setPlaylistOpen: (playlistOpen) => setState({ playlistOpen })
      }),
      {
        name: "lmp:player",
        storage: createJSONStorage(() => localStorage),
        partialize: ({ volume, muted }) => ({ volume, muted }),
        /**
         * The stored value is outside our control (another version, a hand edit), so keep only valid fields.
         */
        merge: (persisted, current) => {
          const { volume, muted } = (persisted ?? {}) as Partial<State>
          return {
            ...current,
            ...(typeof volume === "number" &&
              Number.isFinite(volume) && { volume: clamp(volume, 0, 1) }),
            ...(typeof muted === "boolean" && { muted })
          }
        }
      }
    )
  )

export type PlayerStore = ReturnType<typeof createPlayerStore>
