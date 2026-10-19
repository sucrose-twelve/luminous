import { UPSCALE_MODELS } from "./constants"
import { type VideoInfo } from "./ffprobe"
import { type ArgsValidator } from "./validator.zod"

export type Target = Pick<ArgsValidator, "scale" | "frame" | "content">

export type UpscalePlan = {
  /**
   * Real-ESRGAN scale factor, or `null` to skip upscaling.
   */
  factor: number | null
  /**
   * RIFE frame rate multiplier, or `null` to skip interpolation.
   */
  multiplier: number | null
  /**
   * Short side after the AI steps; the final encode resizes it to the target when they differ (`resize`).
   */
  aiShortSide: number
  /**
   * Frame rate after the AI steps; the final encode resamples it to the target when they differ (`resample`).
   */
  aiFps: number
  /**
   * Exact frame rate of the final encode, e.g. `60000/1001`.
   */
  outputRate: string
  resize: boolean
  resample: boolean
}

/**
 * Picks the smallest factor of the content's model that reaches the target, or its largest when none does.
 */
function upscaleFactor(shortSide: number, target: Target) {
  if (target.scale <= shortSide) return null

  const { factors } = UPSCALE_MODELS[target.content]
  return (
    factors.find((factor) => shortSide * factor >= target.scale) ?? Math.max(...factors)
  )
}

/**
 * A rate within 5% of a whole multiple uses that multiple: 29.97 → 60 is x2 (59.94), not x3. Otherwise it
 * rounds up and the final encode resamples down: 24 → 60 is x3 (72), then 60.
 */
function interpolationMultiplier(fps: number, target: Target) {
  if (target.frame <= fps * 1.01) return null

  const ratio = target.frame / fps
  return Math.abs(ratio - Math.round(ratio)) < 0.05 ? Math.round(ratio) : Math.ceil(ratio)
}

/**
 * Decides which steps one video needs to reach the target. Upscaling and interpolation only run when the
 * source is below the target; the final encode resizes and resamples whatever is left.
 *
 * 59.94 / 29.97 stay as they are rather than duplicating frames to hit exactly 60 / 30.
 */
export function planUpscale(video: VideoInfo, target: Target): UpscalePlan {
  const shortSide = Math.min(video.width, video.height)
  const factor = upscaleFactor(shortSide, target)
  const multiplier = interpolationMultiplier(video.fps, target)

  const aiShortSide = shortSide * (factor ?? 1)
  const aiFps = video.fps * (multiplier ?? 1)
  const resample = Math.abs(aiFps - target.frame) / target.frame > 0.01
  const [numerator, denominator] = video.rate.split("/").map(Number)

  return {
    factor,
    multiplier,
    aiShortSide,
    aiFps,
    outputRate: resample
      ? String(target.frame)
      : `${numerator * (multiplier ?? 1)}/${denominator}`,
    resize: aiShortSide !== target.scale,
    resample
  }
}

/**
 * Whether the source already matches the target, so there is nothing to do.
 */
export function isPlanEmpty(plan: UpscalePlan) {
  return !plan.factor && !plan.multiplier && !plan.resize && !plan.resample
}
