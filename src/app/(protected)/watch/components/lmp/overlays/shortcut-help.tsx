"use client"

import { Kbd, Modal } from "@heroui/react"
import { KeyboardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Fragment } from "react"

import { cls } from "@/libs/utils"

import { HOTKEYS, type HotkeyAction } from "../hotkeys"

/**
 * The list of keyboard shortcuts, rendered from `HOTKEYS`, so it always matches what the keys do.
 *
 * A HeroUI `Modal` portaled into the player (`<Lmp>`), so it shows in fullscreen. It doesn't pause the video,
 * and the other shortcuts keep working: they're read on `window` before the dialog sees them. Escape, the
 * close button, or a click outside closes it; focus moves into it on open and returns on close.
 *
 * @param unsupported - Actions this browser can't do (PiP on Firefox); their rows are dimmed
 */
export function ShortcutHelp({
  isOpen,
  onClose,
  unsupported
}: Readonly<{
  isOpen: boolean
  onClose: () => void
  unsupported: ReadonlySet<HotkeyAction>
}>) {
  return (
    <Modal>
      <Modal.Backdrop
        variant='transparent'
        isOpen={isOpen}
        onOpenChange={(open) => !open && onClose()}>
        <Modal.Container
          size='md'
          placement='center'
          scroll='inside'
          className='sm:w-full'>
          <Modal.Dialog className='max-h-full w-full max-w-md rounded-md bg-black/80 p-5 text-white shadow-none ring-1 ring-white/10 backdrop-blur-md'>
            <Modal.Header className='flex-row items-center gap-3 border-b border-white/15 pb-3'>
              <HugeiconsIcon icon={KeyboardIcon} size={22} strokeWidth={1.5} />
              <Modal.Heading className='grow text-base font-medium text-white'>
                Keyboard shortcuts
              </Modal.Heading>
              <Modal.CloseTrigger
                aria-label='Close (Esc)'
                className='data-[focus-visible=true]:ring-theme static size-9 rounded-full bg-transparent text-white/80 data-[hovered=true]:bg-transparent data-[hovered=true]:text-white'
              />
            </Modal.Header>
            <Modal.Body className='m-0 p-0'>
              <dl className='mt-1 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2.5 text-sm'>
                {HOTKEYS.map((hotkey) => {
                  const isUnsupported = unsupported.has(hotkey.action)
                  return (
                    <Fragment key={hotkey.action}>
                      <dt
                        className={cls(
                          "text-white/85",
                          isUnsupported && "text-white/35"
                        )}>
                        {hotkey.label}
                        {isUnsupported && (
                          <span className='block text-xs'>
                            Not supported in this browser
                          </span>
                        )}
                      </dt>
                      <dd
                        className={cls(
                          "flex items-center justify-end gap-1",
                          isUnsupported && "opacity-35"
                        )}>
                        {hotkey.keys.map((key, index) => (
                          <Fragment key={key}>
                            {index > 0 && <span className='text-white/50'>+</span>}
                            <Kbd className='h-auto min-w-7 justify-center rounded-sm bg-white/10 px-1.5 py-0.5 text-xs text-white ring-1 ring-white/15'>
                              <Kbd.Content>{key}</Kbd.Content>
                            </Kbd>
                          </Fragment>
                        ))}
                      </dd>
                    </Fragment>
                  )
                })}
              </dl>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
