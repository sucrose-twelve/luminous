"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Folder01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"

import { createContent } from "@/actions/contents/create"
import { updateContent } from "@/actions/contents/update"
import { contentValidator, type ContentValidator } from "@/actions/contents/validator.zod"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor
} from "@/components/ui/combobox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ModalComponent } from "@/components/ui/modal"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { KIND_LABELS, KINDS, SOURCE_LABELS, SOURCES } from "@/constants"
import { GENRE_LABELS, GENRES } from "@/constants/data/genres"
import { useLoader, type OverlayState } from "@/hooks"
import { slugify } from "@/libs/utils"

import { FormSelect } from "./form-select"

type ContentFormValues = z.input<typeof contentValidator>

/**
 * A content as the edit form needs it.
 */
export type EditableContent = {
  id: string
  slug: string
  title: string
  kind: Content.Kind
  source: Content.Source | null
  altTitles: Content.AlternativeTitles
  synopsis: string | null
  genres: string[]
  sourceDir: string
}

const KIND_ITEMS = KINDS.map((kind) => ({ value: kind, label: KIND_LABELS[kind] }))

const NO_SOURCE = "none"

const SOURCE_ITEMS = [
  { value: NO_SOURCE, label: "None" },
  ...SOURCES.map((source) => ({ value: source, label: SOURCE_LABELS[source] }))
]

/**
 * The alternative titles in the order of `docs/design/controls/alt-titles.png`, each labelled in its own
 * language.
 */
const ALT_TITLE_FIELDS = [
  { key: "JP", label: "日本語" },
  { key: "TH", label: "ภาษาไทย" },
  { key: "EN", label: "English" }
] as const

/**
 * The New / Edit content modal. With `content` it edits that content; without, it creates one and opens its
 * page. The form validates with the action's own `contentValidator`; field errors from the server land under
 * their fields and anything else shows above the buttons.
 */
export function ContentFormModal({
  control,
  content
}: Readonly<{ control: OverlayState; content?: EditableContent }>) {
  return (
    <ModalComponent control={control} size='xl'>
      <ContentHeader
        icon={<HugeiconsIcon icon={Folder01Icon} size={28} strokeWidth={1.6} />}
        title={content ? "Edit content" : "New content"}
        description={
          content
            ? "The slug follows the title. Files are never moved."
            : "Add a title to the catalogue, then its seasons."
        }
      />
      <ContentForm control={control} content={content} />
    </ModalComponent>
  )
}

function ContentForm({
  control,
  content
}: Readonly<{ control: OverlayState; content?: EditableContent }>) {
  const router = useRouter()
  const loader = useLoader()
  const formId = useId()
  const [message, setMessage] = useState<string | null>(null)
  const form = useForm<ContentFormValues, unknown, ContentValidator>({
    resolver: zodResolver(contentValidator),
    defaultValues: content
      ? {
          title: content.title,
          kind: content.kind,
          source: content.source ?? undefined,
          altTitles: content.altTitles,
          synopsis: content.synopsis ?? "",
          genres: content.genres,
          sourceDir: content.sourceDir
        }
      : { title: "", slug: "", altTitles: {}, synopsis: "", genres: [], sourceDir: "" }
  })
  const { errors, isDirty, isSubmitting } = form.formState

  const handleSubmit = form.handleSubmit(async (values) => {
    setMessage(null)
    const result = content
      ? await updateContent(content.id, values)
      : await createContent(values)

    if (!result.ok) {
      if (result.errors) {
        for (const [key, messages] of Object.entries(result.errors)) {
          form.setError(key as keyof ContentFormValues, { message: messages?.[0] })
        }
        return
      }
      setMessage(result.message ?? null)
      return
    }

    control.close()
    toast.success(content ? "Content saved" : "Content created")
    if ("warning" in result && typeof result.warning === "string")
      toast.warning(result.warning)
    if (!content) {
      loader.on()
      router.push(`/ctrl/contents/${result.content.id}`)
    }
  })

  return (
    <>
      <form
        id={formId}
        noValidate
        className='grid grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:px-8'
        onSubmit={handleSubmit}>
        <Field className='col-span-2 gap-1.5'>
          <FieldLabel htmlFor={`${formId}-title`}>Title</FieldLabel>
          <Input
            className='h-9'
            id={`${formId}-title`}
            aria-invalid={!!errors.title}
            {...form.register("title")}
          />
          {content ? <SlugPreview control={form.control} slug={content.slug} /> : null}
          <FieldError className='text-xs'>{errors.title?.message}</FieldError>
        </Field>

        {content ? null : (
          <Field className='col-span-2 gap-1.5'>
            <FieldLabel htmlFor={`${formId}-slug`}>Slug (Optional)</FieldLabel>
            <Input
              id={`${formId}-slug`}
              placeholder='From the title'
              className='h-9 font-mono'
              aria-invalid={!!errors.slug}
              {...form.register("slug")}
            />
            <FieldDescription className='text-xs'>
              Needed only when the title has no Latin letters. It can&apos;t be edited
              later.
            </FieldDescription>
            <FieldError className='text-xs'>{errors.slug?.message}</FieldError>
          </Field>
        )}

        <Controller
          control={form.control}
          name='kind'
          render={({ field, fieldState }) => (
            <Field className='gap-1.5'>
              <FieldLabel htmlFor={`${formId}-kind`}>Kind</FieldLabel>
              <FormSelect
                id={`${formId}-kind`}
                items={KIND_ITEMS}
                value={field.value ?? null}
                placeholder='Choose a kind'
                isInvalid={fieldState.invalid}
                onChange={field.onChange}
              />
              <FieldError className='text-xs'>{fieldState.error?.message}</FieldError>
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name='source'
          render={({ field }) => (
            <Field className='gap-1.5'>
              <FieldLabel htmlFor={`${formId}-source`}>Source (Optional)</FieldLabel>
              <FormSelect
                id={`${formId}-source`}
                items={SOURCE_ITEMS}
                value={field.value ?? NO_SOURCE}
                onChange={(value) =>
                  field.onChange(value === NO_SOURCE ? undefined : value)
                }
              />
            </Field>
          )}
        />

        <fieldset className='col-span-2 flex flex-col gap-3 rounded-xl border border-white/10 p-4'>
          <legend className='px-1 text-sm font-medium'>
            Alternative Titles (Optional)
          </legend>
          {ALT_TITLE_FIELDS.map(({ key, label }) => (
            <Field key={key} className='gap-1.5'>
              <FieldLabel htmlFor={`${formId}-alt-${key}`}>{label}</FieldLabel>
              <Input
                className='h-9'
                id={`${formId}-alt-${key}`}
                {...form.register(`altTitles.${key}`)}
              />
            </Field>
          ))}
          <FieldError className='text-xs'>{errors.altTitles?.message}</FieldError>
        </fieldset>

        <Controller
          control={form.control}
          name='genres'
          render={({ field }) => (
            <Field className='col-span-2 gap-1.5'>
              <FieldLabel htmlFor={`${formId}-genres`}>Genres (Optional)</FieldLabel>
              <GenrePicker
                id={`${formId}-genres`}
                value={field.value ?? []}
                onChange={field.onChange}
              />
            </Field>
          )}
        />

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

        <Field className='col-span-2 gap-1.5'>
          <FieldLabel htmlFor={`${formId}-source-dir`}>Source directory</FieldLabel>
          <Input
            id={`${formId}-source-dir`}
            placeholder='Full path, e.g. D:/Contents/Frieren'
            className='h-9 font-mono'
            aria-invalid={!!errors.sourceDir}
            {...form.register("sourceDir")}
          />
          {content ? (
            <SourceDirNotice control={form.control} sourceDir={content.sourceDir} />
          ) : (
            <FieldDescription className='text-xs'>
              The content&apos;s folder; season art goes in its <code>Thumbnails</code>{" "}
              folder.
            </FieldDescription>
          )}
          <FieldError className='text-xs'>{errors.sourceDir?.message}</FieldError>
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
          disabled={isSubmitting || (content !== undefined && !isDirty)}>
          {isSubmitting ? <Spinner /> : null}
          <span className='uppercase'>{content ? "save" : "create"}</span>
        </Button>
      </ContentFooter>
    </>
  )
}

/**
 * Under the title while editing: the slug the new title will get, or that a title without Latin letters keeps
 * the current one (the rule `updateContent` applies).
 */
function SlugPreview({
  control,
  slug
}: Readonly<{ control: Control<ContentFormValues>; slug: string }>) {
  const title = useWatch({ control, name: "title" })
  const next = slugify(title ?? "") || slug

  return (
    <FieldDescription className='text-xs'>
      Slug: <code className='font-mono'>{slug}</code>
      {next !== slug ? (
        <>
          {" "}
          → <code className='font-mono text-amber-300'>{next}</code>
        </>
      ) : null}
    </FieldDescription>
  )
}

/**
 * Under the source directory while editing: moving it moves no files.
 */
function SourceDirNotice({
  control,
  sourceDir
}: Readonly<{ control: Control<ContentFormValues>; sourceDir: string }>) {
  const value = useWatch({ control, name: "sourceDir" })

  return value?.trim() === sourceDir ? (
    <FieldDescription className='text-xs'>
      The content&apos;s folder; season art goes in its <code>Thumbnails</code> folder.
    </FieldDescription>
  ) : (
    <FieldDescription className='text-xs text-amber-300'>
      No files are moved. Seasons whose sources sit outside the new folder still play, but
      can&apos;t be imported again.
    </FieldDescription>
  )
}

/**
 * Picks genres from `GENRES`, searchable by their label, shown as chips.
 */
function GenrePicker({
  id,
  value,
  onChange
}: Readonly<{ id: string; value: string[]; onChange: (value: string[]) => void }>) {
  const anchor = useComboboxAnchor()

  return (
    <Combobox
      items={GENRES}
      multiple
      value={value}
      itemToStringLabel={(slug: string) => GENRE_LABELS[slug] ?? slug}
      onValueChange={onChange}>
      <ComboboxChips ref={anchor} className='min-h-9'>
        <ComboboxValue>
          {(selected: string[]) =>
            selected.map((slug) => (
              <ComboboxChip key={slug}>{GENRE_LABELS[slug] ?? slug}</ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput id={id} placeholder={value.length ? "" : "Add genres…"} />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No genres found.</ComboboxEmpty>
        <ComboboxList>
          {(slug: string) => (
            <ComboboxItem key={slug} value={slug}>
              {GENRE_LABELS[slug] ?? slug}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
