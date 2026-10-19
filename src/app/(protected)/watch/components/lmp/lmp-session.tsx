"use client"

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  type RefObject
} from "react"

import { cls } from "@/libs/utils"
import { usePlayerStore } from "@/stores/player"

import { updatePlaybackPreference } from "../../actions/update"
import { ControlBar, type LmpMenu } from "./controls/control-bar"
import { releasePlaylistFocus } from "./controls/playlist-button"
import type { PlaybackPreference } from "./controls/preferences-menu"
import { TopBar } from "./controls/top-bar"
import { useAutoplayNext } from "./hooks/use-autoplay-next"
import { useControlsVisibility } from "./hooks/use-controls-visibility"
import { useDoubleTap } from "./hooks/use-double-tap"
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
import { DoubleTapRipple } from "./overlays/double-tap-ripple"
import { EndCard } from "./overlays/end-card"
import { Osd } from "./overlays/osd"
import { PlaybackError } from "./overlays/playback-error"
import { ShortcutHelp } from "./overlays/shortcut-help"
import { SkipButton } from "./overlays/skip-button"
import { SkipNotice } from "./overlays/skip-notice"
import { StoppedOverlay } from "./overlays/stopped-overlay"
import type { LmpActions, LmpAudioTrack, LmpHandoff, LmpProps } from "./types"
import { episodeLabel, withEpisodeTitle } from "./utils"

/**
 * How long a seek shortcut shows the controls, and how long ↑ / ↓ keep the volume slider out.
 */
const SEEK_REVEAL = 2_000
const VOLUME_REVEAL = 1_500

const VOLUME_STEP = 0.05

/**
 * The per-episode part of the player, keyed by track: everything here starts fresh on each episode or audio
 * track, while the container and `<video>` it drives belong to `<Lmp>`.
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
  const { status, error, isBlocked, actions } = useLmpController({
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
  const [openMenu, setOpenMenu] = useState<LmpMenu | null>(null)
  const [isHoveringBars, setIsHoveringBars] = useState(false)
  const [isVolumeExpanded, setIsVolumeExpanded] = useState(false)
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const isPlaying = status === "playing" || status === "buffering"
  const isPlaylistOpen = usePlayerStore((state) => state.playlistOpen)
  const setPlaylistOpen = usePlayerStore((state) => state.setPlaylistOpen)
  const isPinned =
    !isPlaying || isHelpOpen || openMenu !== null || isHoveringBars || isPlaylistOpen
  const visibility = useControlsVisibility(containerRef, isPinned)
  const label = episodeLabel(episode, season, playlist.seasons.length > 1)
  const title = `${label} • ${content.title}`
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

  /**
   * Opening one menu closes the other. A menu only clears the state while it's the open one: pressing the other
   * menu's button closes this one (a click outside) and opens that one, in either order.
   */
  const changeMenuOpen = useCallback((menu: LmpMenu, isOpen: boolean) => {
    setOpenMenu((current) => (isOpen ? menu : current === menu ? null : current))
  }, [])

  const openShortcuts = useCallback(() => {
    setOpenMenu(null)
    setIsHelpOpen(true)
  }, [])

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
      setOpenMenu(null)
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

  const closeHelp = useCallback(() => setIsHelpOpen(false), [])

  const togglePip = useCallback(() => {
    pip.toggle().then((isDone) => {
      if (!isDone) osd.flash("Picture-in-picture isn't available right now")
    })
  }, [pip, osd])

  /**
   * Shows the volume slider (and the bar it sits in) for a moment after ↑ / ↓ / Shift+M.
   */
  const showVolume = useCallback(() => {
    clearTimeout(volumeTimerRef.current)
    setIsVolumeExpanded(true)
    visibility.reveal(VOLUME_REVEAL)
    volumeTimerRef.current = setTimeout(() => setIsVolumeExpanded(false), VOLUME_REVEAL)
  }, [visibility])

  const flashVolume = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    osd.flash(
      video.muted || video.volume === 0
        ? "Muted"
        : `Volume ${Math.round(video.volume * 100)}%`
    )
    showVolume()
  }, [videoRef, osd, showVolume])

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
      setOpenMenu(null)
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

  const doubleTap = useDoubleTap(visibility.toggle, actions.seekBy)

  /**
   * Clicking the video does nothing: play / pause only comes from the buttons and shortcuts. Touch goes to the
   * tap gestures: a tap shows or hides the controls, a double tap on either side seeks.
   */
  const handleSurfacePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse") doubleTap.handleTap(event)
    },
    [doubleTap]
  )

  const handleBarFocus = useCallback(() => visibility.reveal(), [visibility])

  useEffect(() => () => clearTimeout(volumeTimerRef.current), [])

  /**
   * Lends this session's actions to the playlist, which lives in `<Lmp>` and outlasts it.
   */
  useEffect(() => {
    actionsRef.current = actions
  }, [actionsRef, actions])

  /**
   * Escape closes the playlist, but only once no menu or shortcut list is open in front of it: those close on
   * the same key, one layer per press. An Escape that a React Aria overlay already took (the season select) is
   * `defaultPrevented`.
   */
  useEffect(() => {
    if (!isPlaylistOpen || openMenu !== null || isHelpOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      releasePlaylistFocus()
      setPlaylistOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPlaylistOpen, openMenu, isHelpOpen, setPlaylistOpen])

  return (
    <>
      <div
        className='absolute inset-0 touch-manipulation'
        onPointerUp={handleSurfacePointerUp}
      />
      <BufferingLight status={status} />
      {(status === "stopped" || isBlocked) && (
        <StoppedOverlay
          episodeId={episode.id}
          isStopped={status === "stopped"}
          onPlay={actions.play}
        />
      )}
      <Osd message={osd.message} />
      <DoubleTapRipple ripple={doubleTap.ripple} />
      <TopBar
        backHref={backHref}
        title={title}
        isVisible={visibility.isVisible}
        onHoverChange={setIsHoveringBars}
        onFocus={handleBarFocus}
      />
      <ControlBar
        videoRef={videoRef}
        status={status}
        actions={actions}
        duration={track.duration}
        skips={episode.skips}
        sprite={sprite}
        prev={prev}
        next={next}
        audio={{ tracks: audioTracks, currentId: track.id, onSelect: selectAudioTrack }}
        preference={preference}
        openMenu={openMenu}
        onMenuOpenChange={changeMenuOpen}
        onTogglePreference={togglePreference}
        onOpenShortcuts={openShortcuts}
        pip={{
          isSupported: pip.isSupported,
          isActive: pip.isActive,
          onToggle: togglePip
        }}
        fullscreen={{
          isSupported: fullscreen.isSupported,
          isActive: fullscreen.isFullscreen,
          onToggle: fullscreen.toggle
        }}
        isVisible={visibility.isVisible}
        isVolumeExpanded={isVolumeExpanded}
        onHoverChange={setIsHoveringBars}
        onFocus={handleBarFocus}
      />
      <div
        className={cls(
          "pointer-events-none absolute inset-0 flex items-end justify-between gap-4 px-3 pb-6 transition-[padding] duration-200 sm:px-5",
          visibility.isVisible && "pb-34 sm:pb-36",
          isPlaylistOpen && "max-lg:landscape:pr-[calc(clamp(320px,25%,480px)+1.25rem)]"
        )}>
        <div>
          {skipState.notice && (
            <SkipNotice notice={skipState.notice} onUndo={skipState.undo} />
          )}
        </div>
        {status === "ended" && (
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
      <ShortcutHelp isOpen={isHelpOpen} onClose={closeHelp} unsupported={unsupported} />
      {error && <PlaybackError error={error} />}
    </>
  )
}
