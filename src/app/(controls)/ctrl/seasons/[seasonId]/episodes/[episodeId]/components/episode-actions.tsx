"use client"

import { Clock01Icon, Image01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { useOverlayState } from "@/hooks"

import { EpisodeFormModal, type EditableEpisode } from "./episode-form"
import { SkipEditorModal } from "./skip-editor"
import { ThumbnailCaptureModal } from "./thumbnail-capture"

/**
 * Edit skips, Capture thumbnail, and Edit episode, on the right of an episode's title. The first two need a
 * track to play, so they are disabled until the episode has one.
 *
 * @param artTrackId - The track thumbnails and skips are set on (`artTrack`), or `null` without tracks
 * @param duration - The longest track's length, in seconds
 */
export function EpisodeActions({
  episode,
  skips,
  hasThumbnail,
  artTrackId,
  duration
}: Readonly<{
  episode: EditableEpisode
  skips: Content.Skip[]
  hasThumbnail: boolean
  artTrackId: string | null
  duration: number
}>) {
  const editModal = useOverlayState()
  const skipModal = useOverlayState()
  const thumbnailModal = useOverlayState()

  return (
    <>
      <Button
        variant='outline'
        disabled={!artTrackId}
        title={artTrackId ? undefined : "Import a track first"}
        onClick={skipModal.open}>
        <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} data-icon='inline-start' />
        Edit skips
      </Button>
      <Button
        variant='outline'
        disabled={!artTrackId}
        title={artTrackId ? undefined : "Import a track first"}
        onClick={thumbnailModal.open}>
        <HugeiconsIcon icon={Image01Icon} strokeWidth={2} data-icon='inline-start' />
        Capture thumbnail
      </Button>
      <Button onClick={editModal.open}>
        <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} data-icon='inline-start' />
        Edit episode
      </Button>

      <EpisodeFormModal control={editModal} episode={episode} />
      {artTrackId ? (
        <>
          <SkipEditorModal
            control={skipModal}
            episodeId={episode.id}
            trackId={artTrackId}
            duration={duration}
            skips={skips}
          />
          <ThumbnailCaptureModal
            control={thumbnailModal}
            episodeId={episode.id}
            trackId={artTrackId}
            hasThumbnail={hasThumbnail}
          />
        </>
      ) : null}
    </>
  )
}
