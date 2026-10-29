"use client"

import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useId, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteSkip, saveSkip } from "@/actions/episodes/update"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ModalComponent } from "@/components/ui/modal"
import { ContentFooter, ContentHeader } from "@/components/ui/shared"
import { Slider } from "@/components/ui/slider"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SKIP_KIND_LABELS, SKIP_KINDS } from "@/constants"
import type { OverlayState } from "@/hooks"
import { cls } from "@/libs/utils"

import { formatClock, parseClock } from "../utils"

type SkipKind = Content.Skip["kind"]

type Range = [from: number, to: number]

type SkipErrors = { from?: string; to?: string; message?: string }

/**
 * A new skip starts this long, from wherever the editor stands.
 */
const NEW_SKIP_SECONDS = 90

const KIND_CLASS =
  "h-8 rounded-md border border-white/10 bg-transparent px-3 text-sm text-zinc-400 hover:bg-white/5 hover:text-foreground aria-pressed:border-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground"

/**
 * The skip editor (`docs/design/controls/skip-editer.png`): the episode's art track, a timeline with the skip's
 * two handles, and its `FROM` / `LENGTH` / `TO` times. Picking a kind that already has a skip loads it, and
 * saving replaces it; Remove deletes it.
 *
 * @param duration - The longest track's length, the end `saveSkip` checks against
 */
export function SkipEditorModal({
  control,
  episodeId,
  trackId,
  duration,
  skips
}: Readonly<{
  control: OverlayState
  episodeId: string
  trackId: string
  duration: number
  skips: Content.Skip[]
}>) {
  return (
    <ModalComponent control={control} size='xl'>
      <ContentHeader
        icon={<HugeiconsIcon icon={Clock01Icon} size={28} strokeWidth={1.6} />}
        title='Skips'
        description='One intro, outro, and recap per episode, shared by every audio.'
      />
      <SkipEditor
        control={control}
        episodeId={episodeId}
        trackId={trackId}
        duration={duration}
        initialSkips={skips}
      />
    </ModalComponent>
  )
}

function SkipEditor({
  control,
  episodeId,
  trackId,
  duration,
  initialSkips
}: Readonly<{
  control: OverlayState
  episodeId: string
  trackId: string
  duration: number
  initialSkips: Content.Skip[]
}>) {
  const formId = useId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [skips, setSkips] = useState(initialSkips)
  const [kind, setKind] = useState<SkipKind>(
    () =>
      SKIP_KINDS.find((item) => !initialSkips.some((skip) => skip.kind === item)) ??
      "intro"
  )
  const [range, setRange] = useState<Range>(() => {
    const skip = initialSkips.find((item) => item.kind === kind)
    return skip ? [skip.from, skip.to] : [0, Math.min(NEW_SKIP_SECONDS, duration)]
  })
  const [errors, setErrors] = useState<SkipErrors>({})
  const [isPending, startTransition] = useTransition()
  const [from, to] = range
  const current = skips.find((skip) => skip.kind === kind)
  const others = skips.filter((skip) => skip.kind !== kind)

  const seek = useCallback((seconds: number) => {
    const video = videoRef.current
    if (video) video.currentTime = seconds
  }, [])

  const updateRange = useCallback(
    (next: Range) => {
      const clamped: Range = [
        Math.min(Math.max(next[0], 0), duration - 1),
        Math.min(Math.max(next[1], 1), duration)
      ]
      setRange(
        clamped[0] < clamped[1]
          ? clamped
          : [clamped[0], Math.min(clamped[0] + 1, duration)]
      )
      setErrors({})
    },
    [duration]
  )

  const handleKindChange = useCallback(
    (values: string[]) => {
      const next = SKIP_KINDS.find((item) => item === values[0])
      if (!next) return
      setKind(next)
      setErrors({})
      const skip = skips.find((item) => item.kind === next)
      if (skip) {
        setRange([skip.from, skip.to])
        seek(skip.from)
      }
    },
    [seek, skips]
  )

  /**
   * Seeks the video to whichever handle moved, so the frame under it is on screen.
   */
  const handleSliderChange = useCallback(
    (value: number | readonly number[]) => {
      if (!Array.isArray(value)) return
      const [nextFrom, nextTo] = value as Range
      seek(nextFrom !== from ? nextFrom : nextTo)
      updateRange([nextFrom, nextTo])
    },
    [from, seek, updateRange]
  )

  const handleSetFrom = useCallback(() => {
    const video = videoRef.current
    if (video)
      updateRange([
        Math.floor(video.currentTime),
        Math.max(to, Math.floor(video.currentTime) + 1)
      ])
  }, [to, updateRange])

  const handleSetTo = useCallback(() => {
    const video = videoRef.current
    if (video) updateRange([from, Math.ceil(video.currentTime)])
  }, [from, updateRange])

  const handlePreview = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = from
    void video.play()
  }, [from])

  const handleSave = useCallback(() => {
    setErrors({})
    startTransition(async () => {
      const result = await saveSkip(episodeId, { kind, from, to })
      if (!result.ok) {
        setErrors(
          result.errors
            ? { from: result.errors.from?.[0], to: result.errors.to?.[0] }
            : { message: result.message }
        )
        return
      }
      setSkips(result.skips)
      toast.success(`${SKIP_KIND_LABELS[kind]} saved`)
    })
  }, [episodeId, from, kind, to])

  const handleRemove = useCallback(() => {
    setErrors({})
    startTransition(async () => {
      const result = await deleteSkip(episodeId, kind)
      if (!result.ok) {
        setErrors({ message: result.message })
        return
      }
      setSkips(result.skips)
      toast.success(`${SKIP_KIND_LABELS[kind]} removed`)
    })
  }, [episodeId, kind])

  return (
    <>
      <div className='flex flex-col gap-5 px-4 py-6 sm:px-8'>
        <video
          ref={videoRef}
          src={`/api/stream/${trackId}`}
          className='aspect-video w-full rounded-lg bg-black'
          controls
          muted
          preload='metadata'
        />

        <div className='flex flex-col gap-2'>
          <div className='relative h-2 overflow-hidden rounded-full bg-zinc-800'>
            {others.map((skip) => (
              <span
                key={skip.kind}
                title={`${SKIP_KIND_LABELS[skip.kind]} ${formatClock(skip.from)} – ${formatClock(skip.to)}`}
                className='absolute inset-y-0 bg-zinc-500/60'
                style={{
                  left: `${(skip.from / duration) * 100}%`,
                  width: `${((skip.to - skip.from) / duration) * 100}%`
                }}
              />
            ))}
            <span
              className='bg-primary/70 absolute inset-y-0'
              style={{
                left: `${(from / duration) * 100}%`,
                width: `${((to - from) / duration) * 100}%`
              }}
            />
          </div>
          <Slider
            aria-label='Skip range'
            min={0}
            max={duration}
            step={1}
            minStepsBetweenValues={1}
            value={range}
            onValueChange={handleSliderChange}
          />
          <div className='flex justify-between font-mono text-xs text-zinc-500'>
            <span>00:00:00</span>
            <span>{formatClock(duration)}</span>
          </div>
        </div>

        <div className='grid grid-cols-3 gap-4'>
          <ClockField
            id={`${formId}-from`}
            label='From'
            value={from}
            error={errors.from}
            onCommit={(seconds) => updateRange([seconds, Math.max(to, seconds + 1)])}
          />
          <ClockField
            id={`${formId}-length`}
            label='Length'
            value={to - from}
            onCommit={(seconds) => updateRange([from, from + Math.max(seconds, 1)])}
          />
          <ClockField
            id={`${formId}-to`}
            label='To'
            value={to}
            error={errors.to}
            onCommit={(seconds) => updateRange([from, seconds])}
          />
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' size='sm' onClick={handleSetFrom}>
            Set from current time
          </Button>
          <Button variant='outline' size='sm' onClick={handleSetTo}>
            Set to current time
          </Button>
          <Button variant='ghost' size='sm' onClick={handlePreview}>
            Preview from start
          </Button>
        </div>

        <div className='flex items-center gap-3'>
          <span className='text-sm text-zinc-400'>Kind</span>
          <ToggleGroup
            aria-label='Skip kind'
            className='gap-1.5'
            value={[kind]}
            onValueChange={handleKindChange}>
            {SKIP_KINDS.map((item) => (
              <ToggleGroupItem key={item} value={item} className={KIND_CLASS}>
                {SKIP_KIND_LABELS[item]}
                <span
                  aria-hidden
                  className={cls(
                    "size-1.5 rounded-full",
                    skips.some((skip) => skip.kind === item)
                      ? "bg-emerald-400"
                      : "bg-transparent"
                  )}
                />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className='text-xs text-zinc-500'>
            {current ? "Saving replaces this kind's skip." : "No skip of this kind yet."}
          </span>
        </div>

        {errors.message ? (
          <Alert variant='destructive'>
            <AlertDescription>{errors.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <ContentFooter onClose={isPending ? undefined : control.close}>
        <Button
          size='lg'
          className='rounded-sm px-4'
          disabled={isPending}
          onClick={handleSave}>
          {isPending ? <Spinner /> : null}
          <span className='uppercase'>save {SKIP_KIND_LABELS[kind]}</span>
        </Button>
        <Button
          variant='destructive'
          size='lg'
          className='rounded-sm px-4'
          disabled={isPending || !current}
          onClick={handleRemove}>
          <span className='uppercase'>remove</span>
        </Button>
      </ContentFooter>
    </>
  )
}

/**
 * A time field in `HH:MM:SS` (`MM:SS` and plain seconds are read too). It commits on blur or Enter; text that
 * isn't a time goes back to the last value. Keyed by its value, so a change from the slider resets the text.
 */
function ClockField({
  id,
  label,
  value,
  error,
  onCommit
}: Readonly<{
  id: string
  label: string
  value: number
  error?: string
  onCommit: (seconds: number) => void
}>) {
  return (
    <Field className='gap-1.5'>
      <FieldLabel htmlFor={id} className='text-xs tracking-wide text-zinc-400 uppercase'>
        {label}
      </FieldLabel>
      <ClockInput
        key={value}
        id={id}
        value={value}
        isInvalid={!!error}
        onCommit={onCommit}
      />
      <FieldError className='text-xs'>{error}</FieldError>
    </Field>
  )
}

function ClockInput({
  id,
  value,
  isInvalid,
  onCommit
}: Readonly<{
  id: string
  value: number
  isInvalid: boolean
  onCommit: (seconds: number) => void
}>) {
  const [text, setText] = useState(() => formatClock(value))

  const commit = useCallback(() => {
    const seconds = parseClock(text)
    if (seconds === null || seconds === value) {
      setText(formatClock(value))
      return
    }
    onCommit(seconds)
  }, [onCommit, text, value])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") commit()
    },
    [commit]
  )

  return (
    <Input
      id={id}
      inputMode='numeric'
      aria-invalid={isInvalid}
      className='h-11 text-center font-mono text-lg tabular-nums'
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}
