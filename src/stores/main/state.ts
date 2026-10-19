import { createStore } from "zustand"

import { Locales, Theme } from "@/constants/enum"

type State = {
  appVersion: string
  theme: Theme
  locale: Locales
  loader: boolean
}

type Actions = {
  setTheme: (theme: State["theme"]) => void
  setLocale: (locale: State["locale"]) => void
  setLoader: (loader: State["loader"]) => void
}

export type MainState = State & Actions

export const createMainStore = (initialState: State) =>
  createStore<MainState>()((setState) => ({
    ...initialState,
    setTheme: (theme) => setState({ theme }),
    setLocale: (locale) => setState({ locale }),
    setLoader: (loader) => setState({ loader })
  }))

export type MainStore = ReturnType<typeof createMainStore>
