import type { Locales } from "@/constants/enum"

export type LmpAudioTrack = { id: string; language: Locales; isDubbed: boolean }

export type LmpSeason = {
  id: string
  kind: Content.SeasonKind
  seasonNo: number | null
  title: string | null
}

/**
 * An episode the player can jump to (Prev / Next, or the end card), and the audio track it plays in.
 */
export type LmpAdjacent = {
  episodeId: string
  language: Locales
  isDubbed: boolean
  episodeNo: number
  kind: Content.EpisodeKind
  seasonKind: Content.SeasonKind
  seasonNo: number | null
  title: string | null
}

/**
 * `stopped` differs from `paused`: the poster covers the video, buffering is halted, and progress isn't
 * saved. See the state machine in `notes/lumine-media-player.md` §5.1.
 */
export type LmpStatus =
  "loading" | "playing" | "paused" | "buffering" | "stopped" | "ended" | "error"

/**
 * The one way to control the player. Buttons, shortcuts, taps, and Media Session all call these.
 */
export type LmpActions = {
  play: () => void
  pause: () => void
  togglePlay: () => void
  stop: () => void
  seekTo: (time: number) => void
  seekBy: (delta: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  goTo: (target: LmpAdjacent) => void
  switchAudio: (language: Locales) => void
}

/**
 * What one episode's session passes to the next, through a ref owned by the persistent `<Lmp>`.
 *
 * @property playing - Whether the next session starts playing on its own
 * @property positions - Where each track was left, by track ID; a later session of that track starts there
 */
export type LmpHandoff = { playing: boolean; positions: Map<string, number> }

/**
 * Everything the player needs, decided by the server: which track of the episode (`?vid=`) plays, where it
 * starts, and which episodes come before and after. Holds no file path; art is addressed as
 * `/api/art/<kind>/<id>`.
 */
export type LmpProps = {
  track: LmpAudioTrack & {
    mimeCodec: string
    duration: number
    initEnd: number
    fragments: Content.Fragment[]
  }
  audioTracks: LmpAudioTrack[]
  episode: {
    id: string
    episodeNo: number
    kind: Content.EpisodeKind
    title: string | null
    skips: Content.Skip[]
    spriteGrid: Content.SpriteGrid | null
  }
  season: LmpSeason
  content: { id: string; slug: string; title: string }
  /**
   * The neighbors in the language being played; `null` when there is none, or it isn't in that language.
   */
  prev: LmpAdjacent | null
  next: LmpAdjacent | null
  /**
   * The next episode when it exists but not in the language being played, in the language it would play.
   * The end card offers it; Next / Shift+N treat the episode as the last.
   */
  nextFallback: LmpAdjacent | null
  startAt: number
  preference: { autoplayNext: boolean; autoSkip: boolean }
  playlist: {
    seasons: LmpSeason[]
    episodes: {
      id: string
      seasonId: string
      episodeNo: number
      kind: Content.EpisodeKind
      title: string | null
      hasThumbnail: boolean
      /**
       * Audios the episode can play, original first; empty when it has no track yet.
       */
      audios: { language: Locales; isDubbed: boolean }[]
    }[]
  }
  backHref: string
}
