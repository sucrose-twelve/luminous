"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PlayListIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"

import { updateEpisode } from "@/actions/episodes/update"
import { episodeValidator, type EpisodeValidator } from "@/actions/episodes/validator.zod"
import { FormSelect } from "@/app/(controls)/components/form-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ModalComponent } from "@/components/ui/modal"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { EPISODE_KIND_LABELS, EPISODE_KINDS } from "@/constants"
import type { OverlayState } from "@/hooks"

type EpisodeFormValues = z.input<typeof episodeValidator>

/**
 * An episode as the edit form needs it.
 */
export type EditableEpisode = {
  id: string
  episodeNo: number
  kind: Content.EpisodeKind
  title: string | null
  synopsis: string | null
  airedOn: string | null
}

const KIND_ITEMS = EPISODE_KINDS.map((kind) => ({
  value: kind,
  label: EPISODE_KIND_LABELS[kind]
}))

/**
 * The Edit episode modal: kind, title, synopsis, and aired date. The episode number comes from the file name and
 * isn't editable.
 */
export function EpisodeFormModal({
  control,
  episode
}: Readonly<{ control: OverlayState; episode: EditableEpisode }>) {
  return (
    <ModalComponent control={control} size='lg'>
      <ContentHeader
        icon={<HugeiconsIcon icon={PlayListIcon} size={28} strokeWidth={1.6} />}
        title='Edit episode'
        description={`Episode ${episode.episodeNo}`}
      />
      <EpisodeForm control={control} episode={episode} />
    </ModalComponent>
  )
}

function EpisodeForm({
  control,
  episode
}: Readonly<{ control: OverlayState; episode: EditableEpisode }>) {
  const formId = useId()
  const [message, setMessage] = useState<string | null>(null)
  const form = useForm<EpisodeFormValues, unknown, EpisodeValidator>({
    resolver: zodResolver(episodeValidator),
    defaultValues: {
      kind: episode.kind,
      title: episode.title ?? "",
      synopsis: episode.synopsis ?? "",
      airedOn: episode.airedOn ?? ""
    }
  })
  const { errors, isDirty, isSubmitting } = form.formState

  const handleSubmit = form.handleSubmit(async (values) => {
    setMessage(null)
    const result = await updateEpisode(episode.id, values)

    if (!result.ok) {
      if (result.errors) {
        for (const [key, messages] of Object.entries(result.errors)) {
          form.setError(key as keyof EpisodeFormValues, { message: messages?.[0] })
        }
        return
      }
      setMessage(result.message ?? null)
      return
    }

    control.close()
    toast.success("Episode saved")
  })

  return (
    <>
      <form
        id={formId}
        noValidate
        className='grid grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:px-8'
        onSubmit={handleSubmit}>
        <Controller
          control={form.control}
          name='kind'
          render={({ field }) => (
            <Field className='gap-1.5'>
              <FieldLabel htmlFor={`${formId}-kind`}>Kind</FieldLabel>
              <FormSelect
                id={`${formId}-kind`}
                items={KIND_ITEMS}
                value={field.value ?? null}
                onChange={field.onChange}
              />
            </Field>
          )}
        />

        <Field className='gap-1.5'>
          <FieldLabel htmlFor={`${formId}-aired-on`}>Aired on (Optional)</FieldLabel>
          <Input
            className='h-9'
            id={`${formId}-aired-on`}
            type='date'
            aria-invalid={!!errors.airedOn}
            {...form.register("airedOn")}
          />
          <FieldError className='text-xs'>{errors.airedOn?.message}</FieldError>
        </Field>

        <Field className='col-span-2 gap-1.5'>
          <FieldLabel htmlFor={`${formId}-title`}>Title (Optional)</FieldLabel>
          <Input
            className='h-9'
            id={`${formId}-title`}
            aria-invalid={!!errors.title}
            {...form.register("title")}
          />
          <FieldDescription className='text-xs'>
            A special&apos;s or OVA&apos;s title is its tag, e.g. <code>SP - 01</code>.
          </FieldDescription>
          <FieldError className='text-xs'>{errors.title?.message}</FieldError>
        </Field>

        <Field className='col-span-2 gap-1.5'>
          <FieldLabel htmlFor={`${formId}-synopsis`}>Synopsis (Optional)</FieldLabel>
          <Textarea
            className='max-h-50 min-h-25'
            id={`${formId}-synopsis`}
            aria-invalid={!!errors.synopsis}
            {...form.register("synopsis")}
          />
          <FieldError className='text-xs'>{errors.synopsis?.message}</FieldError>
        </Field>

        {message ? (
          <Alert variant='destructive' className='col-span-2'>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
      </form>

      <ContentFooter onClose={isSubmitting ? undefined : control.close}>
        <Button
          type='submit'
          form={formId}
          size='lg'
          className='rounded-sm px-4'
          disabled={isSubmitting || !isDirty}>
          {isSubmitting ? <Spinner /> : null}
          <span className='uppercase'>save</span>
        </Button>
      </ContentFooter>
    </>
  )
}
