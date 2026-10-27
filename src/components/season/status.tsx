import { Badge } from "@/components/ui/badge"
import { cls } from "@/libs/utils"

export function SeasonStatus({ value }: Readonly<{ value: Content.SeasonStatus }>) {
  if (["upcoming", "airing"].indexOf(value) < 0) return null
  return (
    <Badge
      className={cls("capitalize", {
        "bg-rose-500 text-rose-50": value === "upcoming",
        "bg-amber-500 text-amber-50": value === "airing"
      })}>
      {value}
    </Badge>
  )
}
