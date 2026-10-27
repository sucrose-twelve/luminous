import {
  Alert02Icon,
  BrowserIcon,
  LinkSquare02Icon,
  VideoOffIcon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import NextLink from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cls } from "@/libs/utils"

type WatchNoticeProps = {
  kind: "invalid-link" | "not-found" | "unsupported-browser" | "in-app-browser"
}

const NOTICES: Record<
  WatchNoticeProps["kind"],
  { icon: IconSvgElement; title: string; message: string }
> = {
  "invalid-link": {
    icon: Alert02Icon,
    title: "Invalid link",
    message: "This link has no video ID, or the ID is malformed."
  },
  "not-found": {
    icon: VideoOffIcon,
    title: "Video not found",
    message: "It may have been removed or moved."
  },
  "unsupported-browser": {
    icon: BrowserIcon,
    title: "Browser not supported",
    message: "Videos don't play in Safari or Firefox. Open this page in Chrome or Edge."
  },
  "in-app-browser": {
    icon: LinkSquare02Icon,
    title: "Open in a browser",
    message:
      "Videos don't play in an app's built-in browser (LINE, X, Discord). Open this link in Chrome or Edge."
  }
}

/**
 * Message box shown in the player's place when the watch page can't open a track, or this browser can't play
 * one (`browserNotice`). Not a modal and not a 404 page: it fills the viewport in black like the player, so
 * the page doesn't jump.
 *
 * Uses `next/link` rather than `@/components/link`: the watch page has no `MainStoreProvider`, which the top
 * loader needs.
 */
export function WatchNotice({ kind }: Readonly<WatchNoticeProps>) {
  const notice = NOTICES[kind]

  return (
    <main className='flex h-dvh w-full items-center justify-center bg-black px-4'>
      <div
        role='status'
        className='flex w-full max-w-sm flex-col items-center gap-3 rounded-md bg-zinc-900/80 px-6 py-8 text-center ring-1 ring-white/10'>
        <HugeiconsIcon
          icon={notice.icon}
          size={40}
          strokeWidth={1.5}
          className='text-zinc-400'
        />
        <h1 className='text-lg font-medium text-white'>{notice.title}</h1>
        <p className='text-sm text-zinc-400'>{notice.message}</p>
        <NextLink
          href='/browse'
          className={cls(buttonVariants({ size: "lg" }), "mt-3 rounded-sm px-4")}>
          Browse titles
        </NextLink>
      </div>
    </main>
  )
}
