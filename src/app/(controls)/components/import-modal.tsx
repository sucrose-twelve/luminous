"use client"

import { FileImportIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { startImport } from "@/actions/imports/create"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { ModalComponent } from "@/components/ui/modal"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import { Spinner } from "@/components/ui/spinner"
import {
  IMPORT_FLAGS,
  IMPORT_RUNNING_STATUSES,
  KIND_FULL_LABELS,
  type ImportFlag
} from "@/constants"
import { useOverlayState, type OverlayState } from "@/hooks"

import { CopyButton } from "./copy-button"
import { FormSelect } from "./form-select"
import { useImportJob } from "./import-job"

/**
 * What an Import button imports: one season, or every ongoing season of a content kind, offered with how many
 * ongoing seasons each kind has (`readOngoingCounts`).
 */
export type ImportTarget =
  | { type: "season"; seasonId: string }
  | { type: "ongoing"; counts: readonly { kind: Content.Kind; seasons: number }[] }

/**
 * Starts `tests/track.spec.ts` on the server (`startImport`, root only), with its flags opted into per run.
 * Progress shows in the page's `ImportStatusCard`. The command is still offered for a terminal. Needs an
 * `ImportJobProvider`, which tells it whether another import is running.
 */
export function ImportModal({
  control,
  target
}: Readonly<{ control: OverlayState; target: ImportTarget }>) {
  const job = useImportJob()
  const formId = useId()
  const kindItems =
    target.type === "ongoing"
      ? target.counts.map(({ kind, seasons }) => ({
          value: kind,
          label: `${KIND_FULL_LABELS[kind]} (${seasons})`
        }))
      : []
  const [kind, setKind] = useState<Content.Kind | null>(kindItems[0]?.value ?? null)
  const [flags, setFlags] = useState<ImportFlag[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isBusy = job !== null && IMPORT_RUNNING_STATUSES.includes(job.status)
  const isOngoing = target.type === "ongoing"

  const command = [
    "bun tests/track.spec.ts",
    ...(target.type === "season"
      ? ["--season", target.seasonId]
      : ["--kind", kind ?? ""]),
    ...IMPORT_FLAGS.filter((item) => flags.includes(item.key)).map((item) => item.flag)
  ].join(" ")

  const toggleFlag = useCallback(
    (flag: ImportFlag, isChecked: boolean) =>
      setFlags((current) =>
        IMPORT_FLAGS.map((item) => item.key).filter((item) =>
          item === flag ? isChecked : current.includes(item)
        )
      ),
    []
  )

  const handleStart = useCallback(() => {
    if (target.type === "ongoing" && !kind) return
    setMessage(null)
    startTransition(async () => {
      const result = await startImport({
        target:
          target.type === "season"
            ? { type: "season", seasonId: target.seasonId }
            : { type: "ongoing", kind },
        flags
      })
      if (!result.ok) {
        setMessage(result.message)
        return
      }

      control.close()
      toast.success(`Started importing ${result.job.target.name}`)
    })
  }, [control, flags, kind, target])

  return (
    <ModalComponent control={control} size='lg'>
      <ContentHeader
        icon={<HugeiconsIcon icon={FileImportIcon} size={28} strokeWidth={1.6} />}
        title={isOngoing ? "Import ongoing" : "Import tracks"}
        description={
          isOngoing
            ? "Every upcoming and airing season of one kind, one after another."
            : "Episodes, tracks, thumbnails, and sprite sheets of this season."
        }
      />
      <div className='flex flex-col gap-5 px-4 py-6 sm:px-8'>
        {isOngoing ? (
          kindItems.length > 0 ? (
            <Field className='gap-1.5'>
              <FieldLabel htmlFor={`${formId}-kind`}>Kind</FieldLabel>
              <FormSelect
                id={`${formId}-kind`}
                items={kindItems}
                value={kind}
                onChange={setKind}
              />
            </Field>
          ) : (
            <p className='text-sm text-zinc-400'>
              No upcoming or airing seasons to import.
            </p>
          )
        ) : null}

        <div className='flex flex-col gap-3'>
          {IMPORT_FLAGS.map((item) => (
            <label
              key={item.key}
              htmlFor={`${formId}-${item.key}`}
              className='flex cursor-pointer items-start gap-3'>
              <Checkbox
                id={`${formId}-${item.key}`}
                className='mt-0.5'
                checked={flags.includes(item.key)}
                onCheckedChange={(isChecked) => toggleFlag(item.key, isChecked)}
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

        {isBusy ? (
          <p className='text-xs text-amber-300'>
            {job.target.name} is still importing. Start this one when it ends, or cancel
            it from its card.
          </p>
        ) : null}
        {message ? (
          <Alert variant='destructive'>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <div className='flex flex-col gap-1.5'>
          <span className='text-xs text-zinc-500'>
            Or run it in the server&apos;s terminal, from the project folder:
          </span>
          <div className='flex items-start gap-2 rounded-lg bg-black/40 p-3'>
            <code className='min-w-0 grow font-mono text-xs break-all text-zinc-300'>
              {command}
            </code>
            <CopyButton value={command} label='Command' />
          </div>
        </div>
      </div>
      <ContentFooter onClose={isPending ? undefined : control.close}>
        <Button
          size='lg'
          className='rounded-sm px-4'
          disabled={isPending || isBusy || (isOngoing && !kind)}
          onClick={handleStart}>
          {isPending ? <Spinner /> : null}
          <span className='uppercase'>start import</span>
        </Button>
      </ContentFooter>
    </ModalComponent>
  )
}

/**
 * A button that opens `ImportModal`.
 */
export function ImportButton({
  target,
  label = "Import tracks",
  size = "default"
}: Readonly<{ target: ImportTarget; label?: string; size?: "default" | "sm" }>) {
  const modal = useOverlayState()

  return (
    <>
      <Button variant='outline' size={size} onClick={modal.open}>
        <HugeiconsIcon icon={FileImportIcon} strokeWidth={2} data-icon='inline-start' />
        {label}
      </Button>
      <ImportModal control={modal} target={target} />
    </>
  )
}
