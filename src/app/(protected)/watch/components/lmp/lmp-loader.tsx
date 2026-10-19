"use client"

import dynamic from "next/dynamic"

import { BufferingLight } from "./overlays/buffering-light"
import { PlayerFrame } from "./player-frame"
import type { LmpProps } from "./types"

/**
 * Client-only: the player needs `window` (MediaSource, `localStorage`) from its first render.
 */
const Lmp = dynamic(() => import("./lmp"), {
  ssr: false,
  loading: () => (
    <PlayerFrame>
      <BufferingLight status='loading' />
    </PlayerFrame>
  )
})

export function LmpLoader(props: Readonly<LmpProps>) {
  return <Lmp {...props} />
}
