/**
 * The short side (px) each `--scale` targets. Counting the short side keeps portrait videos at the same
 * quality as landscape ones.
 */
export const SCALES: Record<string, number> = {
  "720p": 720,
  "1080p": 1080,
  "1440p": 1440,
  "2160p": 2160,
  "2k": 1440,
  "4k": 2160
}

export const FRAME_RATES = [30, 60] as const

/**
 * Files `--dir` picks up, by lowercase extension. Only files directly inside it are read, never sub-folders.
 */
export const VIDEO_EXTENSIONS = [
  ".mp4",
  ".m4v",
  ".mkv",
  ".mov",
  ".webm",
  ".avi",
  ".wmv",
  ".flv",
  ".ts"
]

/**
 * Audio codecs the final MP4 carries as they are. Anything else is re-encoded to AAC.
 */
export const MP4_AUDIO_CODECS = ["aac", "mp3", "ac3", "eac3", "opus", "flac", "alac"]
export const AAC_BITRATE = "320k"

/**
 * The Real-ESRGAN model of each `--content`, with the scale factors it ships with. `realesrgan-plus` only has
 * 4x, so `real` always upscales 4x and the final encode shrinks the frames to the target.
 */
export const UPSCALE_MODELS: Record<
  "real" | "anime",
  { model: string; factors: number[] }
> = {
  real: { model: "realesrgan-plus", factors: [4] },
  anime: { model: "realesr-animevideov3", factors: [2, 3, 4] }
}

/**
 * Past this factor the rest is plain resizing, not AI.
 */
export const MAX_AI_FACTOR = 4

/**
 * RIFE models to try, best first. Video2X's default is used when none is in its `models/rife/` folder.
 */
export const RIFE_MODELS = ["rife-v4.26", "rife-v4.25", "rife-v4.6"]

/**
 * How different (%) two frames must be to count as a scene cut: RIFE repeats the frame there instead of
 * blending two scenes into a ghost.
 */
export const SCENE_THRESHOLD = 20

/**
 * RIFE runs in UHD mode from this short side up.
 */
export const RIFE_UHD_FROM = 1440

/**
 * Near-lossless H.264 for the files passed between Video2X steps.
 */
export const INTERMEDIATE_ARGS = [
  "-c",
  "libx264",
  "-e",
  "crf=10",
  "-e",
  "preset=veryfast"
]

/**
 * Quality of the final encode (NVENC `-cq` / libx265 `-crf`): lower is better and bigger.
 */
export const FINAL_QUALITY = 18

/**
 * Each file's intermediates go to `<out>/.work/<name>/`, removed once the file is done. The final encode is
 * written to `PARTIAL_FILE` there and renamed over the output only once ffmpeg succeeds.
 */
export const WORK_FOLDER = ".work"
export const PARTIAL_FILE = "final.partial.mp4"

/**
 * Video2X 6.4.0 drops 2–5 frames at the end of each step. An output this much shorter than the source (the
 * larger of the two) still counts as complete.
 */
export const DURATION_TOLERANCE = { seconds: 0.5, ratio: 0.02 }

/**
 * Video2X prints this once the output is fully written, before it may crash on exit.
 */
export const VIDEO2X_SUCCESS = "Video processed successfully"
