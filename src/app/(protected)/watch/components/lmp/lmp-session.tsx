"use client"

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  type RefObject
} from "react"

import { cls } from "@/libs/utils"
import { usePlayerStore } from "@/stores/player"

import { updatePlaybackPreference } from "../../actions/update"
import { BottomBar } from "./controls/bottom-bar"
import { FullscreenButton } from "./controls/fullscreen-button"
import { PipButton } from "./controls/pip-button"
import { PlaybackControls } from "./controls/playback-controls"
import { PlaylistButton } from "./controls/playlist-button"
import { PreferencesMenu, type PlaybackPreference } from "./controls/preferences-menu"
import { TopBar } from "./controls/top-bar"
import { VolumeButton } from "./controls/volume-button"
import { useAutoplayNext } from "./hooks/use-autoplay-next"
import { useControlsVisibility } from "./hooks/use-controls-visibility"
import { useFullscreen } from "./hooks/use-fullscreen"
import { useLmpController } from "./hooks/use-lmp-controller"
import { useLmpHotkeys, type HotkeyHandlers } from "./hooks/use-lmp-hotkeys"
import { useMediaSession } from "./hooks/use-media-session"
import { useOsd } from "./hooks/use-osd"
import { usePictureInPicture } from "./hooks/use-picture-in-picture"
import { useSkips } from "./hooks/use-skips"
import { useSpritePreview } from "./hooks/use-sprite-preview"
import type { HotkeyAction } from "./hotkeys"
import { BufferingLight } from "./overlays/buffering-light"
import { EndCard } from "./overlays/end-card"
import { Osd } from "./overlays/osd"
import { PlaybackError } from "./overlays/playback-error"
import { ShortcutHelp } from "./overlays/shortcut-help"
import { SkipButton } from "./overlays/skip-button"
import { SkipNotice } from "./overlays/skip-notice"
import { StoppedOverlay } from "./overlays/stopped-overlay"
import type { LmpActions, LmpAudioTrack, LmpHandoff, LmpProps } from "./types"
import { episodeLabel, episodeName, seasonLabel, withEpisodeTitle } from "./utils"

/**
 * How long a seek shortcut shows the controls.
 */
const SEEK_REVEAL = 2_000

const VOLUME_STEP = 0.05

/**
 * The per-episode part of the player, keyed by track: everything here starts fresh on each episode or audio
 * track, while the container and `<video>` it drives belong to `<Lmp>`.
 *
 * Lays out the controls of `docs/design/LMP.png`: the top bar (Back, titles, and the volume, PiP,
 * fullscreen, Playlist, and Preferences buttons), the playback buttons in the middle, and the time over the
 * progress bar at the bottom. Only one of the Preferences menu, the shortcut list, and the Playlist is open at
 * a time.
 */
export function LmpSession({
  containerRef,
  videoRef,
  handoffRef,
  actionsRef,
  ...props
}: Readonly<
  LmpProps & {
    containerRef: RefObject<HTMLElement | null>
    videoRef: RefObject<HTMLVideoElement | null>
    handoffRef: RefObject<LmpHandoff>
    actionsRef: RefObject<LmpActions | null>
  }
>) {
  const {
    track,
    audioTracks,
    episode,
    season,
    content,
    prev,
    next,
    startAt,
    playlist,
    backHref
  } = props
  const { status, error, actions } = useLmpController({
    videoRef,
    handoffRef,
    episodeId: episode.id,
    track,
    startAt
  })
  const osd = useOsd()
  const fullscreen = useFullscreen(containerRef, videoRef)
  const pip = usePictureInPicture(videoRef)
  const [preference, setOptimisticPreference] = useOptimistic(props.preference)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isHoveringBars, setIsHoveringBars] = useState(false)
  const isPlaying = status === "playing" || status === "buffering"
  const isPlaylistOpen = usePlayerStore((state) => state.playlistOpen)
  const setPlaylistOpen = usePlayerStore((state) => state.setPlaylistOpen)
  /**
   * The end card shows once the episode ended with somewhere to go (`<EndCard>` needs `next` or
   * `nextFallback`). Without one, the Replay button in the middle is the only way on, so the controls stay
   * pinned as on any pause.
   */
  const hasEndCard = status === "ended" && (next !== null || props.nextFallback !== null)
  const isPinned =
    (!isPlaying && !hasEndCard) ||
    isHelpOpen ||
    isMenuOpen ||
    isHoveringBars ||
    isPlaylistOpen
  const visibility = useControlsVisibility(containerRef, isPinned)
  const hideControls = visibility.hide
  const label = episodeLabel(episode, season, playlist.seasons.length > 1)
  const skipState = useSkips({
    videoRef,
    actions,
    status,
    skips: episode.skips,
    duration: track.duration,
    next,
    autoSkip: preference.autoSkip,
    autoplayNext: preference.autoplayNext
  })

  /**
   * `Season 1 • Episode 01` under the content title; a movie is named by its season alone, unless that only
   * repeats the content title.
   */
  const subtitle = useMemo(() => {
    const parts =
      season.kind === "movie"
        ? [seasonLabel(season)]
        : [seasonLabel(season), episodeName(episode)]
    return parts.filter((part) => part !== content.title)
  }, [season, episode, content.title])

  const spriteSrc = `/api/art/sprite/${episode.id}`
  const isSpriteReady = useSpritePreview(videoRef, spriteSrc, episode.spriteGrid !== null)
  const sprite = useMemo(
    () =>
      isSpriteReady && episode.spriteGrid
        ? { src: spriteSrc, grid: episode.spriteGrid }
        : null,
    [isSpriteReady, spriteSrc, episode.spriteGrid]
  )

  const goNext = useCallback(() => {
    if (next) actions.goTo(next)
  }, [next, actions])
  const autoplay = useAutoplayNext(
    status === "ended" && preference.autoplayNext && next !== null,
    goNext
  )

  const closeMenu = useCallback(() => setIsMenuOpen(false), [])

  const togglePlaylist = useCallback(() => {
    setIsMenuOpen(false)
    setIsHelpOpen(false)
    setPlaylistOpen(!isPlaylistOpen)
  }, [isPlaylistOpen, setPlaylistOpen])

  const openShortcuts = useCallback(() => {
    setIsMenuOpen(false)
    setPlaylistOpen(false)
    setIsHelpOpen(true)
  }, [setPlaylistOpen])

  const closeHelp = useCallback(() => setIsHelpOpen(false), [])

  /**
   * Flips at once (optimistic) and saves to the account. The action refreshes the page, so the props catch up;
   * on failure the switch falls back to them.
   */
  const togglePreference = useCallback(
    (key: keyof PlaybackPreference) => {
      startTransition(async () => {
        setOptimisticPreference((current) => ({ ...current, [key]: !current[key] }))
        const result = await updatePlaybackPreference({ [key]: !preference[key] })
        if (!result.ok) osd.flash("Couldn't save the preference")
      })
    },
    [preference, setOptimisticPreference, osd]
  )

  /**
   * Plays another audio track from the same second, and remembers the choice for the account: a dub by its
   * language, the original as `null` ("original audio"), so other titles follow it too.
   */
  const selectAudioTrack = useCallback(
    (selected: LmpAudioTrack) => {
      setIsMenuOpen(false)
      if (selected.id === track.id) return

      actions.switchAudio(selected.language)
      startTransition(async () => {
        const result = await updatePlaybackPreference({
          audioLanguage: selected.isDubbed ? selected.language : null
        })
        if (!result.ok) osd.flash("Couldn't save the audio language")
      })
    },
    [track.id, actions, osd]
  )

  const unsupported = useMemo(() => {
    const actionsSet = new Set<HotkeyAction>()
    if (!pip.isSupported) actionsSet.add("togglePip")
    if (!fullscreen.isSupported) actionsSet.add("toggleFullscreen")
    return actionsSet
  }, [pip.isSupported, fullscreen.isSupported])

  const togglePip = useCallback(() => {
    pip.toggle().then((isDone) => {
      if (!isDone) osd.flash("Picture-in-picture isn't available right now")
    })
  }, [pip, osd])

  const flashVolume = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    osd.flash(
      video.muted || video.volume === 0
        ? "Muted"
        : `Volume ${Math.round(video.volume * 100)}%`
    )
  }, [videoRef, osd])

  const changeVolume = useCallback(
    (delta: number) => {
      const video = videoRef.current
      if (!video) return
      actions.setVolume(video.volume + delta)
      flashVolume()
    },
    [videoRef, actions, flashVolume]
  )

  const seekBy = useCallback(
    (delta: number) => {
      actions.seekBy(delta)
      osd.flashSeek(delta)
      visibility.reveal(SEEK_REVEAL)
    },
    [actions, osd, visibility]
  )

  const handlers: HotkeyHandlers = {
    togglePlay: () => {
      const video = videoRef.current
      const willPlay =
        !video || video.paused || status === "stopped" || status === "ended"
      actions.togglePlay()
      osd.flash(willPlay ? "Play" : "Pause")
    },
    stop: () => {
      actions.stop()
      osd.flash("Stopped")
    },
    toggleMute: () => {
      actions.toggleMute()
      flashVolume()
    },
    volumeUp: () => changeVolume(VOLUME_STEP),
    volumeDown: () => changeVolume(-VOLUME_STEP),
    seekBackward: () => seekBy(-10),
    seekForward: () => seekBy(10),
    seekBackwardLong: () => seekBy(-30),
    seekForwardLong: () => seekBy(30),
    prev: () => {
      if (prev) actions.goTo(prev)
      else osd.flash("No previous episode")
    },
    next: () => {
      if (next) actions.goTo(next)
      else osd.flash("No next episode")
    },
    toggleFullscreen: () => {
      if (!fullscreen.isSupported)
        return osd.flash("Fullscreen isn't supported in this browser")
      fullscreen.toggle()
      osd.flash(fullscreen.isFullscreen ? "Exit fullscreen" : "Fullscreen")
    },
    togglePip: () => {
      if (!pip.isSupported)
        return osd.flash("Picture-in-picture isn't supported in this browser")
      togglePip()
    },
    toggleShortcutHelp: () => {
      setIsMenuOpen(false)
      setPlaylistOpen(false)
      setIsHelpOpen((isOpen) => !isOpen)
    }
  }

  useLmpHotkeys(handlers)

  useMediaSession({
    videoRef,
    actions,
    status,
    title: withEpisodeTitle(label, episode),
    episode,
    season,
    content,
    prev,
    next,
    duration: track.duration
  })

  /**
   * Clicking the video does nothing: play / pause only comes from the buttons and shortcuts. A tap shows or
   * hides the controls.
   */
  const handleSurfacePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse") visibility.toggle()
    },
    [visibility]
  )

  const handleBarFocus = useCallback(() => visibility.reveal(), [visibility])

  /**
   * The end card stands alone: the other controls leave as soon as it shows, and come back like during
   * playback (mouse movement, a tap, keyboard focus, a seek shortcut).
   */
  useEffect(() => {
    if (hasEndCard) hideControls()
  }, [hasEndCard, hideControls])

  /**
   * Lends this session's actions to the playlist, which lives in `<Lmp>` and outlasts it.
   */
  useEffect(() => {
    actionsRef.current = actions
  }, [actionsRef, actions])

  return (
    <>
      <div className='absolute inset-0' onPointerUp={handleSurfacePointerUp} />
      {status === "stopped" && <StoppedOverlay episodeId={episode.id} />}
      <BufferingLight status={status} />
      <PlaybackControls
        status={status}
        prev={prev}
        next={next}
        actions={actions}
        isVisible={visibility.isVisible}
        onHoverChange={setIsHoveringBars}
        onFocus={handleBarFocus}
      />
      <BottomBar
        videoRef={videoRef}
        duration={track.duration}
        skips={episode.skips}
        sprite={sprite}
        actions={actions}
        isVisible={visibility.isVisible}
        onHoverChange={setIsHoveringBars}
        onFocus={handleBarFocus}
      />
      <div
        className={cls(
          "pointer-events-none absolute inset-0 flex items-end justify-between gap-4 px-4 pb-6 transition-[padding] duration-200 sm:px-8 sm:pb-8",
          visibility.isVisible && "pb-20 sm:pb-26"
        )}>
        <div>
          {skipState.notice && (
            <SkipNotice notice={skipState.notice} onUndo={skipState.undo} />
          )}
        </div>
        {hasEndCard && (
          <EndCard
            next={next}
            fallback={props.nextFallback}
            audio={track}
            hasSeasons={playlist.seasons.length > 1}
            deadline={autoplay.deadline}
            onGo={actions.goTo}
            onReplay={actions.play}
            onCancel={autoplay.cancel}
          />
        )}
        {skipState.range && status !== "ended" && status !== "stopped" && (
          <SkipButton
            key={`${skipState.range.kind}:${skipState.range.from}`}
            kind={skipState.range.kind}
            hasNext={next !== null}
            isProminent={visibility.isVisible}
            onSkip={skipState.skip}
          />
        )}
      </div>
      <Osd message={osd.message} />
      {isMenuOpen && (
        /**
         * A click anywhere but the Preferences popover (which sits above this) closes it, and does nothing
         * else: a tap here doesn't also toggle the controls.
         */
        <div aria-hidden className='absolute inset-0 z-10' onClick={closeMenu} />
      )}
      <TopBar
        backHref={backHref}
        title={content.title}
        subtitle={subtitle}
        isVisible={visibility.isVisible}
        onHoverChange={setIsHoveringBars}
        onFocus={handleBarFocus}>
        <VolumeButton actions={actions} />
        <PipButton
          isSupported={pip.isSupported}
          isActive={pip.isActive}
          onToggle={togglePip}
        />
        <FullscreenButton
          isSupported={fullscreen.isSupported}
          isFullscreen={fullscreen.isFullscreen}
          onToggle={fullscreen.toggle}
        />
        <PlaylistButton isOpen={isPlaylistOpen} onToggle={togglePlaylist} />
        <PreferencesMenu
          isOpen={isMenuOpen}
          onOpenChange={setIsMenuOpen}
          preference={preference}
          onTogglePreference={togglePreference}
          audio={{ tracks: audioTracks, currentId: track.id, onSelect: selectAudioTrack }}
          onOpenShortcuts={openShortcuts}
        />
      </TopBar>
      <ShortcutHelp isOpen={isHelpOpen} onClose={closeHelp} unsupported={unsupported} />
      {error && <PlaybackError error={error} />}
    </>
  )
}
