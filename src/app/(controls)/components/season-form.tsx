"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Add01Icon, Delete02Icon, Tv01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import { useCallback, useId, useState } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"

import { createSeason } from "@/actions/contents/create"
import { updateSeason } from "@/actions/contents/update"
import { seasonValidator, type SeasonValidator } from "@/actions/contents/validator.zod"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ModalComponent } from "@/components/ui/modal"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  SEASON_KIND_LABELS,
  SEASON_KINDS,
  SEASON_STATUSES,
  STATUS_LABELS
} from "@/constants"
import { Locales } from "@/constants/enum"
import { useLoader, type OverlayState } from "@/hooks"
import { languageName } from "@/libs/language"

import { FormSelect } from "./form-select"

type SeasonFormValues = z.input<typeof seasonValidator>

/**
 * The content a season belongs to.
 */
export type SeasonParent = { id: string; title: string; sourceDir: string }

/**
 * A season as the edit form needs it.
 */
export type EditableSeason = {
  id: string
  kind: Content.SeasonKind
  seasonNo: number | null
  title: string | null
  synopsis: string | null
  status: Content.SeasonStatus
  sources: Content.SeasonSource[]
  poster: string
  releasedOn: string
}

const KIND_ITEMS = SEASON_KINDS.map((kind) => ({
  value: kind,
  label: SEASON_KIND_LABELS[kind]
}))

const STATUS_ITEMS = SEASON_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status]
}))

const LANGUAGE_ITEMS = Object.values(Locales).map((language) => ({
  value: language,
  label: languageName(language)
}))

/**
 * The New / Edit season modal. With `season` it edits that season; without, it creates one in `content` and
 * opens its page, where the import command is. The form validates with the action's own `seasonValidator`;
 * the action then checks the poster and sources on disk, and those errors land under their fields.
 */
export function SeasonFormModal({
  control,
  content,
  season
}: Readonly<{ control: OverlayState; content: SeasonParent; season?: EditableSeason }>) {
  return (
    <ModalComponent control={control} size='xl'>
      <ContentHeader
        icon={<HugeiconsIcon icon={Tv01Icon} size={28} strokeWidth={1.6} />}
        title={season ? "Edit season" : "New season"}
        description={content.title}
      />
      <SeasonForm control={control} content={content} season={season} />
    </ModalComponent>
  )
}

function SeasonForm({
  control,
  content,
  season
}: Readonly<{ control: OverlayState; content: SeasonParent; season?: EditableSeason }>) {
  const router = useRouter()
  const loader = useLoader()
  const formId = useId()
  const [message, setMessage] = useState<string | null>(null)
  /**
   * A new source starts inside the content's folder, which saves typing the longest part of the path.
   */
  const folder = `${content.sourceDir}/`
  const form = useForm<SeasonFormValues, unknown, SeasonValidator>({
    resolver: zodResolver(seasonValidator),
    defaultValues: season
      ? {
          contentId: content.id,
          kind: season.kind,
          seasonNo: season.seasonNo ?? undefined,
          title: season.title ?? "",
          synopsis: season.synopsis ?? "",
          status: season.status,
          sources: season.sources,
          poster: season.poster,
          releasedOn: season.releasedOn
        }
      : {
          contentId: content.id,
          kind: "season",
          status: "finished",
          title: "",
          synopsis: "",
          poster: "",
          releasedOn: "",
          sources: [{ language: Locales.JP, pathname: folder, isDubbed: false }]
        }
  })
  const sources = useFieldArray({ control: form.control, name: "sources" })
  const kind = useWatch({ control: form.control, name: "kind" })
  const seasonNo = useWatch({ control: form.control, name: "seasonNo" })
  const { errors, isDirty, isSubmitting } = form.formState
  /**
   * The art folder follows the kind and number (`seasonArtDirectory`), so changing either moves where the next
   * import writes thumbnails; art already made keeps its stored path.
   */
  const isArtMoved =
    season !== undefined &&
    (kind !== season.kind || (seasonNo ?? null) !== season.seasonNo)

  const handleAddSource = useCallback(
    () => sources.append({ language: Locales.TH, pathname: folder, isDubbed: true }),
    [folder, sources]
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    setMessage(null)
    const result = season
      ? await updateSeason(season.id, values)
      : await createSeason(values)

    if (!result.ok) {
      if (result.errors) {
        for (const [key, messages] of Object.entries(result.errors)) {
          /**
           * A season may have several bad sources, so every message is kept.
           */
          form.setError(key as keyof SeasonFormValues, {
            message: key === "sources" ? messages?.join(" · ") : messages?.[0]
          })
        }
        return
      }
      setMessage(result.message ?? null)
      return
    }

    control.close()
    toast.success(season ? "Season saved" : "Season created")
    if ("warning" in result && typeof result.warning === "string") {
      toast.warning(result.warning)
    }
    if (!season) {
      loader.on()
      router.push(`/ctrl/seasons/${result.season.id}`)
    }
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
                onChange={(value) => {
                  field.onChange(value)
                  if (value === "movie") form.setValue("seasonNo", undefined)
                }}
              />
            </Field>
          )}
        />

        <Field className='gap-1.5'>
          <FieldLabel htmlFor={`${formId}-season-no`}>
            Season no.{kind === "season" ? "" : " (Optional)"}
          </FieldLabel>
          <Input
            className='h-9'
            id={`${formId}-season-no`}
            type='number'
            min={0}
            disabled={kind === "movie"}
            placeholder={kind === "movie" ? "A movie has none" : undefined}
            aria-invalid={!!errors.seasonNo}
            {...form.register("seasonNo", {
              setValueAs: (value: string) => (value === "" ? undefined : Number(value))
            })}
          />
          <FieldError className='text-xs'>{errors.seasonNo?.message}</FieldError>
          {isArtMoved ? (
            <FieldDescription className='text-xs text-amber-300'>
              The next import writes art to another folder; existing art stays where it
              is.
            </FieldDescription>
          ) : null}
        </Field>

        <Field className='col-span-2 gap-1.5'>
          <FieldLabel htmlFor={`${formId}-title`}>Title (Optional)</FieldLabel>
          <Input
            className='h-9'
            id={`${formId}-title`}
            placeholder='Named by its kind and number when empty'
            aria-invalid={!!errors.title}
            {...form.register("title")}
          />
          <FieldError className='text-xs'>{errors.title?.message}</FieldError>
        </Field>

        <Controller
          control={form.control}
          name='status'
          render={({ field }) => (
            <Field className='gap-1.5'>
              <FieldLabel htmlFor={`${formId}-status`}>Status</FieldLabel>
              <FormSelect
                id={`${formId}-status`}
                items={STATUS_ITEMS}
                value={field.value ?? null}
                onChange={field.onChange}
              />
            </Field>
          )}
        />

        <Field className='gap-1.5'>
          <FieldLabel htmlFor={`${formId}-released-on`}>Released on</FieldLabel>
          <Input
            className='h-9'
            id={`${formId}-released-on`}
            type='date'
            aria-invalid={!!errors.releasedOn}
            {...form.register("releasedOn")}
          />
          <FieldError className='text-xs'>{errors.releasedOn?.message}</FieldError>
        </Field>

        <Field className='col-span-2 gap-1.5'>
          <FieldLabel htmlFor={`${formId}-poster`}>Poster</FieldLabel>
          <Input
            id={`${formId}-poster`}
            placeholder='Full path to an image, e.g. D:/Contents/Frieren/poster.webp'
            className='h-9 font-mono'
            aria-invalid={!!errors.poster}
            {...form.register("poster")}
          />
          <FieldError className='text-xs'>{errors.poster?.message}</FieldError>
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

        <fieldset className='col-span-2 flex flex-col gap-3 rounded-xl border border-white/10 p-4'>
          <legend className='px-1 text-sm font-medium'>Sources</legend>
          <FieldDescription className='text-xs'>
            {kind === "movie"
              ? "Each audio version's .mp4 file."
              : "Each audio version's folder of 01.mp4, 02.mp4, …"}{" "}
            Only the primary source (the original, or the first dub) has to exist now.
          </FieldDescription>

          {sources.fields.map((source, index) => (
            <div
              key={source.id}
              className='grid grid-cols-[1fr_auto] gap-x-2 gap-y-2 rounded-lg border border-white/5 p-3'>
              <div className='flex items-center gap-4'>
                <Controller
                  control={form.control}
                  name={`sources.${index}.language`}
                  render={({ field }) => (
                    <FormSelect
                      items={LANGUAGE_ITEMS}
                      value={field.value ?? null}
                      className='w-40'
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`sources.${index}.isDubbed`}
                  render={({ field }) => (
                    <label className='flex h-9 items-center gap-2 text-sm text-zinc-300'>
                      <Checkbox
                        name={field.name}
                        checked={field.value}
                        inputRef={field.ref}
                        onCheckedChange={field.onChange}
                      />
                      Dub
                    </label>
                  )}
                />
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label='Remove source'
                className='row-span-2 self-end'
                disabled={sources.fields.length === 1}
                onClick={() => sources.remove(index)}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              </Button>
              <Input
                aria-label='Path'
                className='h-9 font-mono'
                aria-invalid={!!errors.sources?.[index]?.pathname}
                {...form.register(`sources.${index}.pathname`)}
              />
            </div>
          ))}

          <FieldError className='text-xs'>
            {errors.sources?.message ?? errors.sources?.root?.message}
          </FieldError>

          <Button
            type='button'
            variant='outline'
            size='sm'
            className='w-fit'
            onClick={handleAddSource}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon='inline-start' />
            Add source
          </Button>
        </fieldset>

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
          disabled={isSubmitting || (season !== undefined && !isDirty)}>
          {isSubmitting ? <Spinner /> : null}
          <span className='uppercase'>{season ? "save" : "create"}</span>
        </Button>
      </ContentFooter>
    </>
  )
}
