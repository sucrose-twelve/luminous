"use client"

import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useState, useTransition } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useOverlayState } from "@/hooks"
import { cls } from "@/libs/utils"

import { deleteWatchHistory } from "../actions/delete"

/**
 * Removes a title from the history after a confirmation dialog. The list view shows it with its label, the
 * grid view as an icon.
 *
 * The dialog closes on success (the action refreshes the page without the row) and stays open with the error
 * otherwise. `Esc` cancels it, except while the removal runs.
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
    <AlertDialog open={state.isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={
          <Button
            variant='outline'
            size={isIconOnly ? "icon-lg" : "lg"}
            aria-label={isIconOnly ? `Remove ${title} from history` : undefined}
            className={cls(
              "hover:text-destructive rounded-lg font-bold",
              !isIconOnly && "px-3",
              className
            )}
          />
        }>
        <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.8} />
        {isIconOnly ? null : "Remove"}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className='bg-destructive/10 text-destructive'>
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.8} />
          </AlertDialogMedia>
          <AlertDialogTitle>Remove from watch history?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className='text-foreground'>{title}</strong> and its saved progress
            will be removed. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className='text-destructive text-sm'>{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant='destructive'
            disabled={isPending}
            onClick={handleRemove}>
            {isPending ? <Spinner /> : null}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
