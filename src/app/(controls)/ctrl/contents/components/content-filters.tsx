"use client"

import { PanelBody } from "@/app/(controls)/components/control-page"
import {
  ChipFilter,
  FilterActions,
  GenreFilter
} from "@/app/(controls)/components/filter-panel"
import { useFilterDraft } from "@/app/(controls)/hooks/use-filter-draft"
import { KIND_LABELS, KINDS, SOURCE_LABELS, SOURCES } from "@/constants"

import { contentFilterParsers } from "../validator.nuqs"

const KIND_ITEMS = KINDS.map((kind) => ({ value: kind, label: KIND_LABELS[kind] }))

const SOURCE_ITEMS = SOURCES.map((source) => ({
  value: source,
  label: SOURCE_LABELS[source]
}))

/**
 * The contents page's filters panel: kind, source, and genres, applied together.
 */
export function ContentFilters() {
  const filters = useFilterDraft(contentFilterParsers)

  return (
    <>
      <PanelBody>
        <ChipFilter
          title='Kind'
          items={KIND_ITEMS}
          value={filters.draft.kind}
          onChange={(value) => filters.set("kind", value)}
        />
        <ChipFilter
          title='Source'
          items={SOURCE_ITEMS}
          value={filters.draft.source}
          onChange={(value) => filters.set("source", value)}
        />
        <GenreFilter
          value={filters.draft.genres}
          onChange={(value) => filters.set("genres", value)}
        />
      </PanelBody>
      <FilterActions
        isDirty={filters.isDirty}
        hasFilters={filters.hasFilters}
        isPending={filters.isPending}
        onApply={filters.apply}
        onReset={filters.reset}
      />
    </>
  )
}
