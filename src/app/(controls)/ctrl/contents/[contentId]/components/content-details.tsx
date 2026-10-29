import { ClampedText } from "@/app/(controls)/components/clamped-text"
import { PanelSection } from "@/app/(controls)/components/control-page"
import {
  DetailList,
  DetailRow,
  PathValue,
  ShortId
} from "@/app/(controls)/components/detail-list"
import { formatDate } from "@/app/(controls)/utils"
import { Badge } from "@/components/ui/badge"
import { KIND_LABELS, SOURCE_LABELS } from "@/constants"
import { GENRE_LABELS } from "@/constants/data/genres"

import type { ControlContent } from "../actions/read"

const ALT_TITLES = [
  { key: "JP", label: "日本語" },
  { key: "TH", label: "ภาษาไทย" },
  { key: "EN", label: "English" }
] as const

/**
 * A content's side panel: every field, the source directory with a copy button, and the synopsis.
 */
export function ContentDetails({ content }: Readonly<{ content: ControlContent }>) {
  return (
    <>
      <PanelSection title='Details'>
        <DetailList>
          <DetailRow label='ID'>
            <ShortId id={content.id} />
          </DetailRow>
          <DetailRow label='Slug'>
            <code className='font-mono text-xs break-all'>{content.slug}</code>
          </DetailRow>
          <DetailRow label='Kind'>{KIND_LABELS[content.kind]}</DetailRow>
          <DetailRow label='Source'>
            {content.source ? SOURCE_LABELS[content.source] : "—"}
          </DetailRow>
          <DetailRow label='Created'>{formatDate(content.createdAt)}</DetailRow>
          <DetailRow label='Updated'>
            {content.updatedAt ? formatDate(content.updatedAt) : "—"}
          </DetailRow>
        </DetailList>
      </PanelSection>

      <PanelSection title='Alternative titles'>
        <DetailList>
          {ALT_TITLES.map(({ key, label }) => (
            <DetailRow key={key} label={label} stacked>
              {content.altTitles[key] || <p className='text-sm text-zinc-500'>—</p>}
            </DetailRow>
          ))}
        </DetailList>
      </PanelSection>

      <PanelSection title='Genres'>
        {content.genres.length ? (
          <div className='flex flex-wrap gap-1'>
            {content.genres.map((slug) => (
              <Badge key={slug} variant='outline'>
                {GENRE_LABELS[slug] ?? slug}
              </Badge>
            ))}
          </div>
        ) : (
          <p className='text-sm text-zinc-500'>—</p>
        )}
      </PanelSection>

      <PanelSection title='Source directory'>
        <PathValue path={content.sourceDir} label='Source directory' />
      </PanelSection>

      <PanelSection title='Synopsis'>
        {content.synopsis ? (
          <ClampedText text={content.synopsis} />
        ) : (
          <p className='text-sm text-zinc-500'>—</p>
        )}
      </PanelSection>
    </>
  )
}
