"use client"

import { Button } from "@heroui/react"
import { UndoIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { SkipNotice as SkipNoticeState } from "../hooks/use-skips"

const MESSAGES: Record<Content.Skip["kind"], string> = {
  intro: "Intro skipped",
  recap: "Recap skipped",
  outro: "Credits skipped"
}

/**
 * The bottom-left notice after Auto Skip jumped a range, with Undo to go back to its start. `useSkips` takes
 * it down after a few seconds.
 */
export function SkipNotice({
  notice,
  onUndo
}: Readonly<{ notice: SkipNoticeState; onUndo: () => void }>) {
  return (
    <div
      role='status'
      className='pointer-events-auto flex items-center gap-1 rounded-md bg-black/60 py-1.5 pr-1.5 pl-4 text-sm text-white ring-1 ring-white/15 backdrop-blur-md'>
      <span>{MESSAGES[notice.skip.kind]}</span>
      <span aria-hidden className='text-white/40'>
        ·
      </span>
      <Button
        variant='ghost'
        size='sm'
        onPress={onUndo}
        className='data-[focus-visible=true]:ring-theme h-auto gap-1.5 rounded-sm px-2.5 py-1 font-medium text-white data-[hovered=true]:bg-white/10'>
        <HugeiconsIcon icon={UndoIcon} size={16} strokeWidth={1.5} />
        Undo
      </Button>
    </div>
  )
}
