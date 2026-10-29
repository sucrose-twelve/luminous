import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS } from "@/constants"
import type { Locales } from "@/constants/enum"
import { languageCode, languageName } from "@/libs/language"
import { cls } from "@/libs/utils"

const STATUS_TONES: Record<Content.SeasonStatus, string> = {
  upcoming: "bg-rose-500/15 text-rose-300",
  airing: "bg-amber-500/15 text-amber-300",
  finished: "bg-emerald-500/15 text-emerald-300",
  hiatus: "bg-sky-500/15 text-sky-300",
  cancelled: "bg-zinc-500/15 text-zinc-400"
}

/**
 * A season's status as a soft chip. Unlike the site's `SeasonStatus`, every status shows: staff need to see
 * finished and cancelled seasons too.
 */
export function SeasonStatusBadge({
  status
}: Readonly<{ status: Content.SeasonStatus }>) {
  return <Badge className={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
}

/**
 * One chip per audio of a season, original first: the language code, with dubs outlined. The full name is in
 * the chip's title.
 *
 * @param missing - Languages to show faded, e.g. a source with no imported track yet
 */
export function AudioBadges({
  audios,
  missing = []
}: Readonly<{
  audios: readonly { language: Locales; isDubbed: boolean }[]
  missing?: readonly Locales[]
}>) {
  const sorted = audios.toSorted((a, b) => Number(a.isDubbed) - Number(b.isDubbed))

  return (
    <div className='flex flex-wrap gap-1'>
      {sorted.map(({ language, isDubbed }) => (
        <Badge
          key={language}
          variant={isDubbed ? "outline" : "secondary"}
          title={`${languageName(language)} (${isDubbed ? "dub" : "original"})${missing.includes(language) ? ", not imported" : ""}`}
          className={cls(missing.includes(language) && "opacity-40")}>
          {languageCode(language)}
        </Badge>
      ))}
    </div>
  )
}
