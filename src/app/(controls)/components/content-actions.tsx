"use client"

import {
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useOverlayState } from "@/hooks"

import { ContentFormModal, type EditableContent } from "./content-form"
import { DeleteContentDialog } from "./delete-content"
import { SeasonFormModal } from "./season-form"

/**
 * The New content button above the contents table.
 */
export function NewContentButton() {
  const modal = useOverlayState()

  return (
    <>
      <Button onClick={modal.open}>
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon='inline-start' />
        New content
      </Button>
      <ContentFormModal control={modal} />
    </>
  )
}

/**
 * Edit content and New season, as buttons on a content's page or as a row's `⋯` menu in the contents table
 * (`variant='menu'`, which also copies the ID). Root also gets Delete (`canDelete`); deleting from the content's
 * own page goes back to the contents list.
 */
export function ContentActions({
  content,
  variant,
  canDelete = false
}: Readonly<{
  content: EditableContent
  variant: "buttons" | "menu"
  canDelete?: boolean
}>) {
  const editModal = useOverlayState()
  const seasonModal = useOverlayState()
  const deleteModal = useOverlayState()

  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content.id)
      toast.success("ID copied")
    } catch {
      toast.error("Couldn't copy the ID")
    }
  }, [content.id])

  return (
    <>
      {variant === "menu" ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label={`Actions for ${content.title}`}
              />
            }>
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='min-w-44'>
            <DropdownMenuItem onClick={editModal.open}>
              <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
              Edit content
            </DropdownMenuItem>
            <DropdownMenuItem onClick={seasonModal.open}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
              New season
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyId}>
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
              Copy ID
            </DropdownMenuItem>
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant='destructive' onClick={deleteModal.open}>
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  Delete content
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className='flex gap-2'>
          {canDelete ? (
            <Button variant='destructive' onClick={deleteModal.open}>
              <HugeiconsIcon
                icon={Delete02Icon}
                strokeWidth={2}
                data-icon='inline-start'
              />
              Delete
            </Button>
          ) : null}
          <Button variant='outline' onClick={editModal.open}>
            <HugeiconsIcon
              icon={PencilEdit02Icon}
              strokeWidth={2}
              data-icon='inline-start'
            />
            Edit content
          </Button>
          <Button onClick={seasonModal.open}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon='inline-start' />
            New season
          </Button>
        </div>
      )}

      <ContentFormModal control={editModal} content={content} />
      <SeasonFormModal control={seasonModal} content={content} />
      {canDelete ? (
        <DeleteContentDialog
          control={deleteModal}
          content={content}
          redirectTo={variant === "buttons" ? "/ctrl/contents" : undefined}
        />
      ) : null}
    </>
  )
}
