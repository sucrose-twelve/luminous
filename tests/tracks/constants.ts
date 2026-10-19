/**
 * The accepted episode file names: `01.mp4` for a regular episode, `14 - SP1.mp4` for a special and
 * `14 - OVA1.mp4` for an OVA. The leading number is the episode number; the tag and its number title the episode.
 */
export const EPISODE_FILE_PATTERN = /^(\d+)(?: - (SP|OVA)(\d+))?\.mp4$/

/**
 * The episode kind of each tag `EPISODE_FILE_PATTERN` accepts.
 */
export const EPISODE_FILE_TAGS: Record<string, Content.EpisodeKind> = {
  SP: "special",
  OVA: "ova"
}

/**
 * `--remux` moves each replaced file into this folder, next to the new one. Never scanned: only files directly
 * inside a source folder are read.
 */
export const ORIGINAL_FOLDER = ".original"

/**
 * Remux output is written here first and renamed over the episode file only once it checks out.
 */
export const REMUX_SUFFIX = ".remux.mp4"

/**
 * Codecs `--remux` copies as they are. Other audio is re-encoded to AAC; other video stops the script, since a
 * video re-encode takes far too long to run unattended.
 */
export const COPY_VIDEO_CODECS = ["h264", "hevc", "av1", "vp9"]
export const COPY_AUDIO_CODECS = ["aac", "opus"]

/**
 * H.264 decodes in browsers only as 8-bit 4:2:0. Hi10P (`yuv420p10le`) and 4:2:2 / 4:4:4 don't.
 */
export const H264_PIXEL_FORMATS = ["yuv420p", "yuvj420p"]

/**
 * How far (in seconds) a remuxed file's duration may drift from the original before it's rejected.
 */
export const REMUX_DURATION_TOLERANCE = 1

/**
 * Codecs whose RFC 6381 string is fixed and needs nothing from the sample entry, by sample entry type.
 */
export const PLAIN_CODECS: Record<string, string> = {
  "Opus": "opus",
  "fLaC": "flac",
  "ac-3": "ac-3",
  "ec-3": "ec-3"
}

export const THUMBNAIL_WIDTH = 640
export const THUMBNAIL_HEIGHT = 360

/**
 * Seconds after the end of the intro to grab the thumbnail at; without an intro skip, the fraction of the episode
 * instead. Both stay clear of the black frames and opening at the start.
 */
export const THUMBNAIL_AFTER_INTRO = 30
export const THUMBNAIL_FALLBACK_RATIO = 0.25

/**
 * 192×108 matches the player's ~200 px hover preview, shown 1:1 (a smaller tile scaled up blurs).
 */
export const SPRITE_TILE = { width: 192, height: 108, columns: 10 }
export const SPRITE_INTERVAL = 10
export const SPRITE_INTERVAL_STEP = 5

/**
 * WebP images can't be wider or taller than this. A long movie gets a wider `interval` so the sheet fits.
 */
export const WEBP_MAX_DIMENSION = 16_383
