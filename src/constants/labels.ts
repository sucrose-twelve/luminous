import type { Seasonal } from "."

export const SOURCE_LABELS: Record<Content.Source, string> = {
  "light_novel": "Light Novel",
  "manga": "Manga",
  "web_manga": "Web Manga",
  "original": "Original",
  "4_koma_manga": "4-Koma Manga",
  "game": "Game",
  "mixed_media": "Mixed Media",
  "novel": "Novel",
  "other": "Other",
  "visual_novel": "Visual Novel",
  "web_novel": "Web Novel"
}

export const STATUS_LABELS: Record<Content.SeasonStatus, string> = {
  upcoming: "Upcoming",
  airing: "Currently Airing",
  finished: "Finished",
  hiatus: "On Hiatus",
  cancelled: "Cancelled"
}

export const SEASONAL_LABELS: Record<Seasonal, string> = {
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall"
}
