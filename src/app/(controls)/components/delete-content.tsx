"use client"

import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import { useCallback, useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteContent } from "@/actions/contents/delete"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useLoader, type OverlayState } from "@/hooks"

export type DeletableContent = {
  id: string
  title: string
  slug: string
  sourceDir: string
}

/**
 * Confirms deleting a content for good (`deleteContent`, root only): its seasons, episodes, tracks, watch
 * history, and its whole source directory on disk. Typing the slug arms the button, and the action checks it
 * again. `Esc` cancels, except while the delete runs.
 *
 * @param redirectTo - Where to go once the content is gone, from a page that shows it
 */
export function DeleteContentDialog({
  control,
  content,
  redirectTo
}: Readonly<{ control: OverlayState; content: DeletableContent; redirectTo?: string }>) {
  const router = useRouter()
  const loader = useLoader()
  const inputId = useId()
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isConfirmed = confirmation.trim() === content.slug

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isPending) return
      setError(null)
      setConfirmation("")
      control.setOpen(isOpen)
    },
    [control, isPending]
  )

  const handleDelete = useCallback(() => {
    setError(null)
    startTransition(async () => {
      const result = await deleteContent(content.id, confirmation.trim())
      if (!result.ok) {
        setError(result.message)
        return
      }

      control.close()
      const { seasons, episodes, tracks } = result.deleted
      toast.success(`${content.title} deleted`, {
        description: `${seasons} seasons, ${episodes} episodes, ${tracks} tracks`
      })
      if (result.leftover) {
        toast.warning("The folder couldn't be removed", {
          description: `Delete ${result.leftover} by hand.`
        })
      }
      if (result.isFolderMissing) toast.info("The source directory was already gone")
      if (result.keptOutside > 0) {
        toast.info(`${result.keptOutside} files outside the source directory were kept`)
      }
      if (redirectTo) {
        loader.on()
        router.replace(redirectTo)
      }
    })
  }, [confirmation, content.id, content.title, control, loader, redirectTo, router])

  return (
    <AlertDialog open={control.isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className='data-[size=default]:sm:max-w-md'>
        <AlertDialogHeader>
          <AlertDialogMedia className='bg-destructive/10 text-destructive'>
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.8} />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {content.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            Every season, episode, and track goes, with everyone&apos;s watch history and
            list entries for it, and this folder with everything in it. This can&apos;t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <code className='rounded-lg bg-black/40 p-3 font-mono text-xs break-all text-zinc-300'>
          {content.sourceDir}
        </code>

        <div className='flex flex-col gap-1.5'>
          <label htmlFor={inputId} className='text-sm text-zinc-400'>
            Type <code className='text-foreground font-mono'>{content.slug}</code> to
            confirm
          </label>
          <Input
            id={inputId}
            autoComplete='off'
            spellCheck={false}
            className='h-9 font-mono'
            value={confirmation}
            disabled={isPending}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>

        {error ? <p className='text-destructive text-sm'>{error}</p> : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant='destructive'
            disabled={!isConfirmed || isPending}
            onClick={handleDelete}>
            {isPending ? <Spinner /> : null}
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
