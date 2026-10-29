"use client"

import { CommandLineIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ModalComponent } from "@/components/ui/modal"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import { useOverlayState, type OverlayState } from "@/hooks"

import { CopyButton } from "./copy-button"

/**
 * The flags `tests/track.spec.ts` takes, unticked by default: both change files on disk, so they're opted into
 * per run rather than left in the command to be deleted.
 */
const FLAGS = [
  {
    flag: "--remux",
    label: "Remux",
    description:
      "Rewrite source files as fragmented MP4. Only needed for files that aren't yet."
  },
  {
    flag: "--force",
    label: "Force",
    description:
      "Regenerate every thumbnail and sprite sheet. Replaces thumbnails picked by hand."
  }
] as const

type Flag = (typeof FLAGS)[number]["flag"]

/**
 * Builds a season's import command to copy into the server's terminal. Opened from the season's page and from
 * an episode's `Not imported` track.
 */
export function ImportCommandModal({
  control,
  seasonId
}: Readonly<{ control: OverlayState; seasonId: string }>) {
  const formId = useId()
  const [flags, setFlags] = useState<Flag[]>([])
  const command = ["bun tests/track.spec.ts --season", seasonId, ...flags].join(" ")

  const toggleFlag = useCallback(
    (flag: Flag, isChecked: boolean) =>
      setFlags((current) =>
        FLAGS.map((item) => item.flag).filter((item) =>
          item === flag ? isChecked : current.includes(item)
        )
      ),
    []
  )

  return (
    <ModalComponent control={control} size='lg'>
      <ContentHeader
        icon={<HugeiconsIcon icon={CommandLineIcon} size={28} strokeWidth={1.6} />}
        title='Import command'
        description="Run it in the server's terminal, from the project folder."
      />
      <div className='flex flex-col gap-5 px-4 py-6 sm:px-8'>
        <div className='flex flex-col gap-3'>
          {FLAGS.map((item) => (
            <label
              key={item.flag}
              htmlFor={`${formId}${item.flag}`}
              className='flex cursor-pointer items-start gap-3'>
              <Checkbox
                id={`${formId}${item.flag}`}
                className='mt-0.5'
                checked={flags.includes(item.flag)}
                onCheckedChange={(isChecked) => toggleFlag(item.flag, isChecked)}
              />
              <span className='flex flex-col gap-0.5'>
                <span className='text-sm font-medium'>
                  {item.label} <code className='font-mono text-xs'>{item.flag}</code>
                </span>
                <span className='text-xs text-zinc-400'>{item.description}</span>
              </span>
            </label>
          ))}
        </div>

        <div className='flex items-start gap-2 rounded-lg bg-black/40 p-3'>
          <code className='min-w-0 grow font-mono text-xs break-all text-zinc-300'>
            {command}
          </code>
          <CopyButton value={command} label='Command' />
        </div>

        <p className='text-xs text-amber-300'>
          After the run, press Refresh site cache on the season&apos;s page so the site
          shows the new episodes.
        </p>
      </div>
      <ContentFooter onClose={control.close} />
    </ModalComponent>
  )
}

/**
 * A button that opens `ImportCommandModal` for a season.
 */
export function ImportCommandButton({
  seasonId,
  size = "default"
}: Readonly<{ seasonId: string; size?: "default" | "sm" }>) {
  const modal = useOverlayState()

  return (
    <>
      <Button variant='outline' size={size} onClick={modal.open}>
        <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} data-icon='inline-start' />
        Import command
      </Button>
      <ImportCommandModal control={modal} seasonId={seasonId} />
    </>
  )
}
