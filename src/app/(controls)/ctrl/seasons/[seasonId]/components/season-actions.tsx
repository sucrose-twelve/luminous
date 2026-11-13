"use client"

import { PencilEdit02Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useTransition } from "react"
import { toast } from "sonner"

import { ImportButton } from "@/app/(controls)/components/import-modal"
import {
  SeasonFormModal,
  type EditableSeason,
  type SeasonParent
} from "@/app/(controls)/components/season-form"
import { Button } from "@/components/ui/button"
import { useOverlayState } from "@/hooks"

import { refreshSeasonCache } from "../actions/update"

/**
 * Edit season, Import tracks (root only), and Refresh site cache, on the right of a season's title. An import
 * from here refreshes the cache by itself; the button is for an import run from a terminal.
 *
 * @param canImport - Whether the viewer may import, which also means the page has an `ImportJobProvider`
 */
export function SeasonActions({
  content,
  season,
  canImport
}: Readonly<{ content: SeasonParent; season: EditableSeason; canImport: boolean }>) {
  const editModal = useOverlayState()
  const [isRefreshing, startRefresh] = useTransition()

  const handleRefresh = useCallback(() => {
    startRefresh(async () => {
      const result = await refreshSeasonCache(season.id)
      if (result.ok) {
        toast.success(
          `Site cache refreshed for ${result.episodes} episodes and ${result.tracks} tracks`
        )
      } else {
        toast.error(result.message)
      }
    })
  }, [season.id])

  return (
    <>
      <Button variant='outline' disabled={isRefreshing} onClick={handleRefresh}>
        <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} data-icon='inline-start' />
        Refresh site cache
      </Button>
      {canImport ? (
        <ImportButton target={{ type: "season", seasonId: season.id }} />
      ) : null}
      <Button onClick={editModal.open}>
        <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} data-icon='inline-start' />
        Edit season
      </Button>

      <SeasonFormModal control={editModal} content={content} season={season} />
    </>
  )
}
