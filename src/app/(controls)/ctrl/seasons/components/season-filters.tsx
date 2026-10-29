"use client"

import { PanelBody } from "@/app/(controls)/components/control-page"
import {
  ChipFilter,
  FilterActions,
  GenreFilter
} from "@/app/(controls)/components/filter-panel"
import { useFilterDraft } from "@/app/(controls)/hooks/use-filter-draft"
import {
  AUDIO_LABELS,
  AUDIOS,
  KIND_LABELS,
  KINDS,
  SEASON_STATUSES,
  SEASONAL_LABELS,
  SEASONALS,
  SOURCE_LABELS,
  SOURCES,
  STATUS_LABELS
} from "@/constants"

import { seasonListFilterParsers } from "../validator.nuqs"

const KIND_ITEMS = KINDS.map((kind) => ({ value: kind, label: KIND_LABELS[kind] }))

const SOURCE_ITEMS = SOURCES.map((source) => ({
  value: source,
  label: SOURCE_LABELS[source]
}))

const STATUS_ITEMS = SEASON_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status]
}))

const AUDIO_ITEMS = AUDIOS.map((audio) => ({ value: audio, label: AUDIO_LABELS[audio] }))

const SEASONAL_ITEMS = SEASONALS.map((seasonal) => ({
  value: seasonal,
  label: SEASONAL_LABELS[seasonal]
}))

/**
 * The seasons page's filters panel: `/browse`'s filters without the release year, applied together. Every
 * option shows even when no season matches it.
 */
export function SeasonFilters() {
  const filters = useFilterDraft(seasonListFilterParsers)

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
          title='Status'
          items={STATUS_ITEMS}
          value={filters.draft.status}
          onChange={(value) => filters.set("status", value)}
        />
        <ChipFilter
          title='Audio'
          items={AUDIO_ITEMS}
          value={filters.draft.audio}
          onChange={(value) => filters.set("audio", value)}
        />
        <ChipFilter
          title='Seasonal'
          items={SEASONAL_ITEMS}
          value={filters.draft.seasonal}
          onChange={(value) => filters.set("seasonal", value)}
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
