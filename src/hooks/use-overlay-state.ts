import { useCallback, useMemo, useState } from "react"

/**
 * Open state of a dialog, sheet or menu, with stable handlers to pass to buttons and to the overlay's
 * `onOpenChange`.
 */
export function useOverlayState(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const setOpen = useCallback((isNextOpen: boolean) => setIsOpen(isNextOpen), [])

  return useMemo(() => ({ isOpen, open, close, setOpen }), [isOpen, open, close, setOpen])
}

export type OverlayState = ReturnType<typeof useOverlayState>
