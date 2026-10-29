export const KINDS = [
  "movie",
  "anime_series",
  "anime_ecchi",
  "tv_series",
  "series",
  "shows",
  "movie_adult"
] as const satisfies readonly Content.Kind[]

/**
 * Adult kinds, left out of every list that isn't filtered to one of them by name: browse without a kind, and
 * the watch history's `All` tab.
 */
export const ADULT_KINDS: Content.Kind[] = ["anime_ecchi", "movie_adult"]

/**
 * Short kind names for the browse cards and filters; the season hero uses `KIND_FULL_LABELS`.
 */
export const KIND_LABELS: Record<Content.Kind, string> = {
  movie: "Movie",
  anime_series: "Anime",
  anime_ecchi: "Anime Ecchi",
  tv_series: "TV Series",
  series: "Series",
  shows: "Shows",
  movie_adult: "Movie Adult"
}

/**
 * Kinds spelled out for the season hero's meta row.
 */
export const KIND_FULL_LABELS: Record<Content.Kind, string> = {
  movie: "Movie",
  anime_series: "Anime Series",
  anime_ecchi: "Anime Ecchi",
  tv_series: "TV Series",
  series: "Series",
  shows: "Shows",
  movie_adult: "Movie Adult"
}

export const SOURCES = [
  "light_novel",
  "manga",
  "web_manga",
  "original",
  "4_koma_manga",
  "game",
  "mixed_media",
  "novel",
  "other",
  "visual_novel",
  "web_novel"
] as const satisfies readonly Content.Source[]

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

export const SEASON_KINDS = [
  "season",
  "movie",
  "special",
  "spinoff"
] as const satisfies readonly Content.SeasonKind[]

/**
 * The season cards' kind chips.
 */
export const SEASON_KIND_LABELS: Record<Content.SeasonKind, string> = {
  season: "Season",
  movie: "The Movie",
  special: "Special",
  spinoff: "Spinoff"
}

/**
 * What an untitled season is called, by kind (`seasonName`).
 */
export const SEASON_KIND_NAMES: Record<Content.SeasonKind, string> = {
  season: "Season",
  movie: "Movie",
  special: "Specials",
  spinoff: "Spinoff"
}

export const SEASON_STATUSES = [
  "upcoming",
  "airing",
  "finished",
  "hiatus",
  "cancelled"
] as const satisfies readonly Content.SeasonStatus[]

export const STATUS_LABELS: Record<Content.SeasonStatus, string> = {
  upcoming: "Upcoming",
  airing: "Currently Airing",
  finished: "Finished",
  hiatus: "On Hiatus",
  cancelled: "Cancelled"
}

/**
 * Anime seasons by release month: winter = Jan–Mar, spring = Apr–Jun, summer = Jul–Sep, fall = Oct–Dec.
 */
export const SEASONALS = ["winter", "spring", "summer", "fall"] as const

export type Seasonal = (typeof SEASONALS)[number]

export const SEASONAL_LABELS: Record<Seasonal, string> = {
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall"
}

export const EPISODE_KINDS = [
  "regular",
  "special",
  "ova",
  "recap"
] as const satisfies readonly Content.EpisodeKind[]

export const EPISODE_KIND_LABELS: Record<Content.EpisodeKind, string> = {
  regular: "Regular",
  special: "Special",
  ova: "OVA",
  recap: "Recap"
}

export const SKIP_KINDS = [
  "intro",
  "outro",
  "recap"
] as const satisfies readonly Content.Skip["kind"][]

export const SKIP_KIND_LABELS: Record<Content.Skip["kind"], string> = {
  intro: "Intro",
  outro: "Outro",
  recap: "Recap"
}

/**
 * What an untitled episode other than a regular one is tagged, by kind (`episodeTag`).
 */
export const EPISODE_KIND_TAGS: Record<
  Exclude<Content.EpisodeKind, "regular">,
  string
> = {
  special: "SP",
  ova: "OVA",
  recap: "Recap"
}
