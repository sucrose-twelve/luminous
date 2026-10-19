declare namespace Account {
  export type Role = "root" | "admin" | "user"
}

declare namespace Content {
  export type Kind = "movie" | "anime_series" | "tv_series" | "series" | "shows"

  export type Source =
    | "light_novel"
    | "manga"
    | "web_manga"
    | "original"
    | "4_koma_manga"
    | "game"
    | "mixed_media"
    | "novel"
    | "other"
    | "visual_novel"
    | "web_novel"

  export type SeasonKind = "season" | "movie" | "special" | "spinoff"

  export type SeasonStatus = "upcoming" | "airing" | "finished" | "hiatus" | "cancelled"

  export type EpisodeKind = "regular" | "special" | "ova" | "recap"

  export type WatchStatus =
    "plan_to_watch" | "watching" | "completed" | "on_hold" | "dropped"

  export type AlternativeTitles = Partial<Record<"JP" | "TH" | "EN", string>>

  /**
   * One audio version of a season: the folder of its `01.mp4`, `02.mp4`, … or, for a movie, the `.mp4` itself,
   * e.g. `{ language: "th-TH", pathname: "<CONTENTS_SOURCE_DIR>/Frieren/Thai Dub/1", isDubbed: true }`
   */
  export type SeasonSource = {
    language: import("@/constants/enum").Locales
    pathname: string
    isDubbed: boolean
  }

  /**
   * Seconds on the episode timeline,
   * e.g. `{ kind: "intro", from: 60, to: 120 }`
   */
  export type Skip = { kind: "intro" | "outro" | "recap"; from: number; to: number }

  /**
   * One `moof` + `mdat` pair: byte range `start … end` covers `time … time + duration` seconds
   */
  export type Fragment = { start: number; end: number; time: number; duration: number }

  /**
   * Layout of an episode's sprite sheet: tile `i` (row-major, `columns` per row) shows `i × interval` seconds,
   * e.g. `{ interval: 10, width: 192, height: 108, columns: 10, count: 143 }`
   */
  export type SpriteGrid = {
    interval: number
    width: number
    height: number
    columns: number
    count: number
  }
}
