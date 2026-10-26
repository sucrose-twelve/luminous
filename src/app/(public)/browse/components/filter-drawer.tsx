"use client"

import {
  Button,
  Label,
  Tag,
  TagGroup,
  useOverlayState,
  type Selection
} from "@heroui/react"
import { FilterVerticalIcon, Refresh01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useMemo, useState } from "react"

import { DrawerComponent } from "@/components/ui/drawer"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import {
  AUDIO_LABELS,
  KIND_LABELS,
  SEASONAL_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS
} from "@/constants"

import type { BrowseFilters } from "../actions/read-filters"
import { useBrowseQuery, type BrowseQuery } from "../hooks/use-browse-query"

type Draft = Pick<
  BrowseQuery,
  "kind" | "source" | "genres" | "audio" | "seasonal" | "year" | "status"
>

type Option<T extends string | number> = { value: T; text: string; count: number }

const EMPTY_DRAFT: Draft = {
  kind: null,
  source: null,
  genres: [],
  audio: null,
  seasonal: null,
  year: null,
  status: null
}

/**
 * The FILTER button and its drawer. Choices are kept in a local draft, seeded from the URL each time the
 * drawer opens: APPLY writes the draft to the URL, CLOSE throws it away.
 */
export function FilterDrawer({ filters }: Readonly<{ filters: BrowseFilters }>) {
  const control = useOverlayState()
  const { query, update } = useBrowseQuery()
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)

  const activeCount =
    [
      query.kind,
      query.source,
      query.audio,
      query.seasonal,
      query.year,
      query.status
    ].filter((value) => value !== null).length + query.genres.length

  const options = useMemo(
    () => ({
      kinds: filters.kinds.map(({ value, count }) => ({
        value,
        count,
        text: KIND_LABELS[value]
      })),
      sources: filters.sources.map(({ value, count }) => ({
        value,
        count,
        text: SOURCE_LABELS[value]
      })),
      genres: filters.genres,
      audios: filters.audios.map(({ value, count }) => ({
        value,
        count,
        text: AUDIO_LABELS[value]
      })),
      seasonals: filters.seasonals.map(({ value, count }) => ({
        value,
        count,
        text: SEASONAL_LABELS[value]
      })),
      years: filters.years.map(({ value, count }) => ({
        value,
        count,
        text: String(value)
      })),
      statuses: filters.statuses.map(({ value, count }) => ({
        value,
        count,
        text: STATUS_LABELS[value]
      }))
    }),
    [filters]
  )

  const handleOpen = useCallback(() => {
    setDraft({
      kind: query.kind,
      source: query.source,
      genres: query.genres,
      audio: query.audio,
      seasonal: query.seasonal,
      year: query.year,
      status: query.status
    })
    control.open()
  }, [query, control])

  const handleApply = useCallback(() => {
    update(draft)
    control.close()
  }, [draft, update, control])

  const handleReset = useCallback(() => setDraft(EMPTY_DRAFT), [])

  const setField = useCallback(
    <K extends keyof Draft>(key: K) =>
      (value: Draft[K]) =>
        setDraft((current) => ({ ...current, [key]: value })),
    []
  )

  return (
    <>
      <Button
        className='bg-foreground/5 text-foreground rounded-sm'
        variant='secondary'
        onPress={handleOpen}>
        <HugeiconsIcon icon={FilterVerticalIcon} size={20} strokeWidth={2} />
        <span className='font-bold uppercase'>filter</span>
        {activeCount > 0 ? (
          <span className='bg-theme text-background grid size-5 place-items-center rounded-full text-xs font-bold'>
            {activeCount}
          </span>
        ) : null}
      </Button>

      <DrawerComponent control={control}>
        <div className='w-full sm:w-120'>
          <ContentHeader
            icon={
              <HugeiconsIcon
                className='size-6 stroke-2 text-zinc-400'
                icon={FilterVerticalIcon}
              />
            }
            title='filter'
            description='Narrow the catalogue by kind, genre, audio, and release.'
          />

          <div className='flex flex-col gap-y-8 px-4 py-6 sm:px-8'>
            <SingleFilter
              label='Kind'
              options={options.kinds}
              value={draft.kind}
              onChange={setField("kind")}
            />
            <SingleFilter
              label='Source'
              options={options.sources}
              value={draft.source}
              onChange={setField("source")}
            />
            <MultipleFilter
              label='Genres'
              options={options.genres}
              value={draft.genres}
              onChange={setField("genres")}
            />
            <SingleFilter
              label='Audio'
              options={options.audios}
              value={draft.audio}
              onChange={setField("audio")}
            />
            <SingleFilter
              label='Seasonal'
              options={options.seasonals}
              value={draft.seasonal}
              onChange={setField("seasonal")}
            />
            <SingleFilter
              label='Year'
              options={options.years}
              value={draft.year}
              onChange={setField("year")}
            />
            <SingleFilter
              label='Status'
              options={options.statuses}
              value={draft.status}
              onChange={setField("status")}
            />
          </div>

          <ContentFooter onClose={control.close}>
            <Button
              className='bg-theme grow rounded-sm'
              type='button'
              variant='primary'
              onPress={handleApply}>
              <span className='text-base font-bold uppercase'>apply</span>
            </Button>

            <Button
              className='bg-foreground/5 text-foreground/75 size-9 rounded-sm'
              type='button'
              variant='secondary'
              isIconOnly
              onPress={handleReset}>
              <HugeiconsIcon
                className='size-5 stroke-2'
                icon={Refresh01Icon}
                color='currentColor'
              />
            </Button>
          </ContentFooter>
        </div>
      </DrawerComponent>
    </>
  )
}

/**
 * Picks the chosen options back out of a React Aria `Selection`, so values keep their own type (a year stays a
 * number) without casting the keys.
 */
function selectedValues<T extends string | number>(
  options: readonly Option<T>[],
  selection: Selection
) {
  return selection === "all"
    ? options.map((option) => option.value)
    : options
        .filter((option) => selection.has(option.value))
        .map((option) => option.value)
}

/**
 * One filter section with a single choice. Pressing the chosen tag again clears it.
 */
function SingleFilter<T extends string | number>({
  label,
  options,
  value,
  onChange
}: Readonly<{
  label: string
  options: readonly Option<T>[]
  value: T | null
  onChange: (value: T | null) => void
}>) {
  const handleChange = useCallback(
    (selection: Selection) => onChange(selectedValues(options, selection)[0] ?? null),
    [options, onChange]
  )

  return (
    <FilterTags
      label={label}
      options={options}
      selectionMode='single'
      selectedKeys={value === null ? [] : [value]}
      onSelectionChange={handleChange}
    />
  )
}

/**
 * One filter section with any number of choices.
 */
function MultipleFilter<T extends string | number>({
  label,
  options,
  value,
  onChange
}: Readonly<{
  label: string
  options: readonly Option<T>[]
  value: readonly T[]
  onChange: (value: T[]) => void
}>) {
  const handleChange = useCallback(
    (selection: Selection) => onChange(selectedValues(options, selection)),
    [options, onChange]
  )

  return (
    <FilterTags
      label={label}
      options={options}
      selectionMode='multiple'
      selectedKeys={value}
      onSelectionChange={handleChange}
    />
  )
}

/**
 * The tag list both filter kinds render. Options without any season are disabled.
 */
function FilterTags<T extends string | number>({
  label,
  options,
  selectionMode,
  selectedKeys,
  onSelectionChange
}: Readonly<{
  label: string
  options: readonly Option<T>[]
  selectionMode: "single" | "multiple"
  selectedKeys: Iterable<T>
  onSelectionChange: (selection: Selection) => void
}>) {
  const disabledKeys = useMemo(
    () => options.filter((option) => option.count === 0).map((option) => option.value),
    [options]
  )

  return (
    <TagGroup
      className='flex flex-col gap-y-3'
      selectionMode={selectionMode}
      selectedKeys={selectedKeys}
      disabledKeys={disabledKeys}
      onSelectionChange={onSelectionChange}>
      <Label className='text-base font-bold'>{label}</Label>
      <TagGroup.List className='flex flex-wrap gap-2'>
        {options.map((option) => (
          <Tag
            key={option.value}
            id={option.value}
            textValue={option.text}
            className='data-[selected=true]:bg-theme data-[selected=true]:text-background cursor-pointer rounded-sm bg-transparent px-2 py-0.5 text-sm text-zinc-300 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-30'>
            {option.text}
          </Tag>
        ))}
      </TagGroup.List>
    </TagGroup>
  )
}
