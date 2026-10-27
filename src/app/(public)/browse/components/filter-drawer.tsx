"use client"

import { FilterVerticalIcon, Refresh01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useId, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { DrawerComponent } from "@/components/ui/drawer"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  AUDIO_LABELS,
  KIND_LABELS,
  SEASONAL_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS
} from "@/constants"
import { useOverlayState } from "@/hooks"

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
        className='bg-foreground/5 text-foreground h-10 rounded-sm px-3'
        variant='secondary'
        onClick={handleOpen}>
        <HugeiconsIcon className='size-5' icon={FilterVerticalIcon} strokeWidth={2} />
        <span className='font-bold uppercase'>filter</span>
        {activeCount > 0 ? (
          <span className='bg-primary text-primary-foreground grid size-5 place-items-center rounded-full text-xs font-bold'>
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
              className='grow rounded-sm'
              type='button'
              size='lg'
              onClick={handleApply}>
              <span className='text-base font-bold uppercase'>apply</span>
            </Button>

            <Button
              className='bg-foreground/5 text-foreground/75 rounded-sm'
              type='button'
              variant='secondary'
              size='icon-lg'
              aria-label='Reset filters'
              onClick={handleReset}>
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
 * Picks the chosen options back out of the toggle group's string values, so values keep their own type (a year
 * stays a number) without casting.
 */
function selectedValues<T extends string | number>(
  options: readonly Option<T>[],
  values: readonly string[]
) {
  return options
    .filter((option) => values.includes(String(option.value)))
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
  const selected = useMemo(() => (value === null ? [] : [String(value)]), [value])

  const handleChange = useCallback(
    (values: string[]) => onChange(selectedValues(options, values)[0] ?? null),
    [options, onChange]
  )

  return (
    <FilterTags
      label={label}
      options={options}
      multiple={false}
      value={selected}
      onValueChange={handleChange}
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
  const selected = useMemo(() => value.map(String), [value])

  const handleChange = useCallback(
    (values: string[]) => onChange(selectedValues(options, values)),
    [options, onChange]
  )

  return (
    <FilterTags
      label={label}
      options={options}
      multiple
      value={selected}
      onValueChange={handleChange}
    />
  )
}

/**
 * The tag list both filter kinds render. Options without any season are disabled, and keep pointer events so
 * the not-allowed cursor shows.
 */
function FilterTags<T extends string | number>({
  label,
  options,
  multiple,
  value,
  onValueChange
}: Readonly<{
  label: string
  options: readonly Option<T>[]
  multiple: boolean
  value: readonly string[]
  onValueChange: (values: string[]) => void
}>) {
  const labelId = useId()

  return (
    <div className='flex flex-col gap-y-3'>
      <p id={labelId} className='text-base font-bold'>
        {label}
      </p>
      <ToggleGroup
        aria-labelledby={labelId}
        className='flex-wrap gap-2'
        multiple={multiple}
        value={value}
        onValueChange={onValueChange}>
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={String(option.value)}
            disabled={option.count === 0}
            className='aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground h-auto min-w-0 cursor-pointer rounded-sm bg-transparent px-2 py-0.5 text-sm font-normal text-zinc-300 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-30'>
            {option.text}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
