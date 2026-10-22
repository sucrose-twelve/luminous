"use client"

import { AnimatePresence, m, type Transition } from "framer-motion"
import { useCallback, useEffect, useId, useRef } from "react"
import { useMedia } from "react-use"

import { cls } from "@/libs/utils"

/**
 * Where a drawer slides in from the right rather than from the bottom: Tailwind's `lg`.
 */
const SIDE_QUERY = "(min-width: 64rem)"

const FOCUSABLE = "a[href], button, [tabindex]:not([tabindex='-1'])"

/**
 * A quick start that settles softly, the same both ways.
 */
const SLIDE: Transition = { duration: 0.4, ease: [0.4, 0.8, 0, 1] }
const FADE: Transition = { duration: 0.1 }

/**
 * The player's drawer (framer-motion), shared by the Playlist and the keyboard shortcut list: from the right
 * on a desktop (`lg` and up), from the bottom below that. It renders inside the player container, so it
 * shows in fullscreen too.
 *
 * A modal dialog: the backdrop dims the player and closes it on a click, as does Escape. Focus moves into it
 * on open, Tab stays inside it, and on close focus returns to whatever had it, or else to the button that
 * toggles it (`data-panel`: nothing had focus, or that button was replaced meanwhile). The player's shortcuts
 * keep working, since they're read on `window` first. The body mounts on each open and unmounts after the
 * exit animation.
 *
 * @param id - The dialog's `id`, which its toggle button names in `aria-controls` / `data-panel`
 * @param children - The body below the header, in a `flex-col` box; it scrolls itself
 */
export function Drawer({
  id,
  isOpen,
  onClose,
  title,
  description,
  icon,
  children
}: Readonly<{
  id?: string
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
}>) {
  const isSide = useMedia(SIDE_QUERY)
  const titleId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  const offset = isSide ? { x: "10%", opacity: 0 } : { y: "10%", opacity: 0 }

  /**
   * Keeps Tab inside the drawer: past the last control it wraps to the first, and back. A drawer with no
   * control (the shortcut list) keeps focus on itself.
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    const panel = panelRef.current
    if (event.key !== "Tab" || !panel) return

    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = items[0]
    const last = items.at(-1)
    const active = document.activeElement
    if (!first || !last) {
      event.preventDefault()
      return
    }

    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }, [])

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!isOpen) return

    /**
     * Safari doesn't focus a clicked button, so the opener may be `<body>`: the toggle stands in for it.
     */
    const opener =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : null
    panelRef.current?.focus({ preventScroll: true })

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current()
    }
    window.addEventListener("keydown", handleEscape)
    return () => {
      window.removeEventListener("keydown", handleEscape)
      const toggle = id
        ? document.querySelector<HTMLElement>(`[data-panel="${id}"]`)
        : null
      const target = opener?.isConnected ? opener : toggle
      target?.focus({ preventScroll: true })
    }
  }, [isOpen, id])

  return (
    <AnimatePresence>
      {isOpen && (
        <div key='drawer' className='absolute inset-0 overflow-hidden'>
          <m.div
            aria-hidden
            className='absolute inset-0 bg-black/50'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            onClick={onClose}
          />
          <m.section
            ref={panelRef}
            id={id}
            role='dialog'
            aria-modal='true'
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            initial={offset}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={offset}
            transition={SLIDE}
            className={cls(
              "bg-background/85 absolute flex flex-col overflow-hidden rounded text-white shadow-2xl backdrop-blur-2xl",
              "ring-foreground/5 ring-4",
              isSide
                ? "inset-y-3 right-3 w-[min(28rem,calc(100%-1.5rem))]"
                : "inset-x-3 bottom-0 mx-auto max-h-[min(80%,40rem)] max-w-2xl rounded-b-none"
            )}>
            <header className='relative flex shrink-0 items-center gap-3 p-4'>
              {icon && <span className='text-white/70 [&_svg]:size-6'>{icon}</span>}
              <div className='min-w-0 grow'>
                <h2 id={titleId} className='text-lg font-semibold'>
                  {title}
                </h2>
                {description && (
                  <p className='truncate text-xs text-white/60'>{description}</p>
                )}
              </div>

              <div className='bg-foreground/10 absolute inset-x-0 bottom-0 mx-4 h-px' />
            </header>
            {children}
          </m.section>
        </div>
      )}
    </AnimatePresence>
  )
}
