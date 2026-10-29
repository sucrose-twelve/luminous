"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { genres } from "@/constants/data/genres"

import { PanelFooter, PanelSection } from "./control-page"

const CHIP_CLASS =
  "h-7 rounded-full border border-white/10 bg-transparent px-3 text-xs text-zinc-400 hover:bg-white/5 hover:text-foreground aria-pressed:border-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground"

/**
 * A multi-choice filter as chips. Every option shows, even one no row matches: staff filter to find gaps too.
 */
export function ChipFilter<T extends string>({
  title,
  items,
  value,
  onChange
}: Readonly<{
  title: string
  items: readonly { value: T; label: string }[]
  value: readonly T[]
  onChange: (value: T[]) => void
}>) {
  return (
    <PanelSection title={title}>
      <ToggleGroup
        multiple
        aria-label={title}
        className='flex-wrap justify-start gap-1.5'
        value={value}
        onValueChange={(next: string[]) =>
          onChange(
            items.filter((item) => next.includes(item.value)).map((item) => item.value)
          )
        }>
        {items.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value} className={CHIP_CLASS}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </PanelSection>
  )
}

/**
 * The genre filter: every genre as a checkbox, with a field that narrows the list by label. Selected genres
 * stay listed first so they can be cleared without searching again.
 */
export function GenreFilter({
  value,
  onChange
}: Readonly<{ value: readonly string[]; onChange: (value: string[]) => void }>) {
  const [search, setSearch] = useState("")
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return genres
      .filter((genre) => !term || genre.text.toLowerCase().includes(term))
      .toSorted((a, b) => Number(value.includes(b.slug)) - Number(value.includes(a.slug)))
  }, [search, value])

  return (
    <PanelSection title={value.length ? `Genres (${value.length})` : "Genres"}>
      <Input
        type='search'
        aria-label='Find a genre'
        placeholder='Find a genre…'
        className='h-8 text-xs'
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className='flex max-h-56 scrollbar-none flex-col gap-0.5 overflow-y-auto pr-1'>
        {visible.map((genre) => (
          <label
            key={genre.slug}
            className='flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-zinc-300 hover:bg-white/5'>
            <Checkbox
              checked={value.includes(genre.slug)}
              onCheckedChange={(isChecked) =>
                onChange(
                  isChecked
                    ? [...value, genre.slug]
                    : value.filter((slug) => slug !== genre.slug)
                )
              }
            />
            {genre.text}
          </label>
        ))}
        {visible.length === 0 ? (
          <p className='px-1.5 py-2 text-xs text-zinc-500'>No genres found.</p>
        ) : null}
      </div>
    </PanelSection>
  )
}

/**
 * Apply and Reset at the bottom of a filters panel (a `PanelFooter`, so it never scrolls away). Filters reach the
 * URL only on Apply; Reset clears the URL's filters and the panel's draft at once.
 *
 * @param isDirty - Whether the draft differs from the URL
 * @param hasFilters - Whether anything is selected, in the draft or the URL
 */
export function FilterActions({
  isDirty,
  hasFilters,
  isPending,
  onApply,
  onReset
}: Readonly<{
  isDirty: boolean
  hasFilters: boolean
  isPending: boolean
  onApply: () => void
  onReset: () => void
}>) {
  return (
    <PanelFooter>
      <Button className='grow' disabled={!isDirty || isPending} onClick={onApply}>
        Apply
      </Button>
      <Button variant='outline' disabled={!hasFilters || isPending} onClick={onReset}>
        Reset
      </Button>
    </PanelFooter>
  )
}
