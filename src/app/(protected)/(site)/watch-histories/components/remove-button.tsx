"use client"

import { AlertDialog, Button, Spinner, useOverlayState } from "@heroui/react"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState, useTransition } from "react"

import { cls } from "@/libs/utils"

import { deleteWatchHistory } from "../actions/delete"

/**
 * Removes a title from the history after a confirmation dialog. The list view shows it with its label, the
 * grid view as an icon.
 *
 * The dialog closes on success (the action refreshes the page without the row) and stays open with the error
 * otherwise. Backdrop click and `Esc` cancel it, except while the removal runs.
 */
export function RemoveButton({
  id,
  title,
  isIconOnly = false,
  className
}: Readonly<{ id: string; title: string; isIconOnly?: boolean; className?: string }>) {
  const state = useOverlayState()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isPending) return
      setError(null)
      state.setOpen(isOpen)
    },
    [isPending, state]
  )

  const handleRemove = useCallback(() => {
    startTransition(async () => {
      const result = await deleteWatchHistory({ id })
      if (result.ok) {
        state.close()
        return
      }
      setError(result.errors.id?.[0] ?? "Couldn't remove this title. Try again.")
    })
  }, [id, state])

  return (
    <>
      <Button
        className={cls(
          "data-[hovered=true]:text-danger h-9 rounded-lg font-bold",
          isIconOnly && "size-9 min-w-0",
          className
        )}
        variant='outline'
        size='sm'
        isIconOnly={isIconOnly}
        aria-label={isIconOnly ? `Remove ${title} from history` : undefined}
        onPress={state.open}>
        <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.8} />
        {isIconOnly ? null : "Remove"}
      </Button>

      <AlertDialog.Backdrop
        variant='blur'
        isDismissable={!isPending}
        isKeyboardDismissDisabled={isPending}
        isOpen={state.isOpen}
        onOpenChange={handleOpenChange}>
        <AlertDialog.Container size='sm'>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status='danger' />
              <AlertDialog.Heading>Remove from watch history?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                <strong>{title}</strong> and its saved progress will be removed. This
                can&apos;t be undone.
              </p>
              {error ? <p className='text-danger mt-2 text-sm'>{error}</p> : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot='close' variant='tertiary' isDisabled={isPending}>
                Cancel
              </Button>
              <Button variant='danger' isPending={isPending} onPress={handleRemove}>
                {isPending ? <Spinner size='sm' color='current' /> : null}
                Remove
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  )
}
