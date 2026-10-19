import fs from "node:fs"
import path from "node:path"

export const VIDEO_EXTENSIONS = [".mp4"]
export const IMAGE_EXTENSIONS = [".webp", ".png", ".jpg", ".jpeg"]

const IMAGE_MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
}

/**
 * Normalizes a path to forward slashes so Windows and POSIX paths compare the same way.
 */
function toForwardSlashes(filePath: string) {
  return filePath.replaceAll("\\", "/")
}

/**
 * Folder, in a content's `sourceDir`, that holds the thumbnails and sprite sheets of all its seasons.
 * `tests/track.spec.ts` never scans it: it only reads files named like `01.mp4`.
 */
const ART_FOLDER = "Thumbnails"

/**
 * Checks that a media path read from the DB stays inside the root it belongs to before it is opened.
 *
 * Only the import step writes paths, but this keeps a bad row from turning a route into a file reader for the
 * whole disk.
 *
 * @param filePath - Full absolute path of the file, e.g. `<CONTENTS_SOURCE_DIR>/Frieren/1/01.mp4`
 * @param root - Full path the file must sit under, or be: a season source's folder
 * (`<CONTENTS_SOURCE_DIR>/Frieren/1`), a movie source's file, or the season's art folder (`seasonArtDirectory`).
 * `null` for art that may sit in any folder (a season's poster), which skips the root check
 * @param extensions - Allowed lowercase extensions, e.g. `VIDEO_EXTENSIONS`
 * @returns `true` when the file is absolute, has no `..` segments, is or sits under `root` (when given), and has
 * an allowed extension
 *
 * @example
 * ```ts
 * isSafeMediaPath("<CONTENTS_SOURCE_DIR>/Frieren/1/01.mp4", "<CONTENTS_SOURCE_DIR>/Frieren/1", VIDEO_EXTENSIONS) // true
 * isSafeMediaPath("<CONTENTS_SOURCE_DIR>/Frieren/Movie.mp4", "<CONTENTS_SOURCE_DIR>/Frieren/Movie.mp4", VIDEO_EXTENSIONS) // true
 * isSafeMediaPath("<CONTENTS_SOURCE_DIR>/Frieren/../secret.webp", "<CONTENTS_SOURCE_DIR>/Frieren", IMAGE_EXTENSIONS) // false
 * ```
 */
export function isSafeMediaPath(
  filePath: string,
  root: string | null,
  extensions: readonly string[]
) {
  const normalized = toForwardSlashes(filePath)
  if (!path.isAbsolute(normalized) || normalized.split("/").includes("..")) return false

  const resolved = toForwardSlashes(path.resolve(normalized)).toLowerCase()
  if (root !== null) {
    const base = toForwardSlashes(path.resolve(root)).toLowerCase().replace(/\/$/, "")
    if (resolved !== base && !resolved.startsWith(`${base}/`)) return false
  }

  return extensions.includes(path.extname(resolved))
}

/**
 * Finds the source a season is known by: its original audio (`isDubbed: false`, at most one), or its first
 * source when it has only dubs. Decided by `isDubbed` alone, never by `pathname` (a `Thai Dub/1` folder may be
 * the original).
 */
export function primarySource(sources: readonly Content.SeasonSource[]) {
  return sources.find((source) => !source.isDubbed) ?? sources[0] ?? null
}

/**
 * Builds the folder a season's thumbnails and sprite sheets live in, always `<sourceDir>/Thumbnails/<name>`,
 * from its primary source (`primarySource`: the original, or the first dub when it has none):
 * - a `season`: its season number (`Thumbnails/1`), wherever its source sits (`1` or `Thai Dub/1`)
 * - a `movie`: its file name without `.mp4` (`Thumbnails/Ordinal Scale`)
 * - a `spinoff` or `special`: the first folder of its source under `sourceDir`, then its season number when it
 *   has one (`Thumbnails/Alternative Gun Gale Online/1`), so it never shares a folder with a main season
 *
 * @param sourceDir - The content's folder (`contents.sourceDir`), e.g. `<CONTENTS_SOURCE_DIR>/SAO`
 * @param season - The season's `kind`, `seasonNo`, and `sources`
 * @returns The full path, or `null` when the season has no source, its primary source isn't inside
 * `sourceDir`, or a `season` has no season number
 *
 * @example
 * ```ts
 * seasonArtDirectory("<CONTENTS_SOURCE_DIR>/SAO", { kind: "season", seasonNo: 1, … }) // "<CONTENTS_SOURCE_DIR>/SAO/Thumbnails/1"
 * seasonArtDirectory("<CONTENTS_SOURCE_DIR>/SAO", { kind: "movie", sources: [{ pathname: "<CONTENTS_SOURCE_DIR>/SAO/Ordinal Scale.mp4", … }], … })
 * // "<CONTENTS_SOURCE_DIR>/SAO/Thumbnails/Ordinal Scale"
 * seasonArtDirectory("<CONTENTS_SOURCE_DIR>/SAO", { kind: "spinoff", seasonNo: 1, sources: [{ pathname: "<CONTENTS_SOURCE_DIR>/SAO/Alternative/Thai Dub/1", … }] })
 * // "<CONTENTS_SOURCE_DIR>/SAO/Thumbnails/Alternative/1"
 * ```
 */
export function seasonArtDirectory(
  sourceDir: string,
  season: {
    kind: Content.SeasonKind
    seasonNo: number | null
    sources: readonly Content.SeasonSource[]
  }
) {
  const primary = primarySource(season.sources)
  if (!primary) return null

  const relative = toForwardSlashes(path.relative(sourceDir, primary.pathname))
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith("../") ||
    path.isAbsolute(relative)
  )
    return null

  const name =
    season.kind === "movie"
      ? path.posix.basename(relative).replace(/\.mp4$/i, "")
      : season.kind === "season"
        ? season.seasonNo?.toString()
        : [relative.split("/")[0], season.seasonNo]
            .filter((part) => part !== null)
            .join("/")
  if (!name) return null

  return path.posix.join(toForwardSlashes(path.resolve(sourceDir)), ART_FOLDER, name)
}

/**
 * Maps an art file's extension to its MIME type.
 *
 * @param filePath - Path or file name of the image
 * @returns The MIME type, or `null` for an unsupported extension (`image/jpg` is not a valid type, so `.jpg`
 * maps to `image/jpeg`)
 */
export function imageMimeType(filePath: string) {
  return IMAGE_MIME_TYPES[path.extname(filePath).toLowerCase()] ?? null
}

/**
 * Opens a file as a web `ReadableStream` for a Route Handler's `Response` body.
 *
 * Built on the global `ReadableStream` rather than `Readable.toWeb`, whose `node:stream/web` type does not match
 * the one `Response` accepts. Reading is pull-based, so a slow client never makes the whole file buffer in memory.
 *
 * @param filePath - Full absolute path of the file, already checked with `isSafeMediaPath`
 * @param signal - The request's signal: the file is closed when the client disconnects
 * @param range - Inclusive byte range to read, e.g. `{ start: 0, end: 1023 }`; the whole file when omitted
 */
export function readFileStream(
  filePath: string,
  signal: AbortSignal,
  range?: { start: number; end: number }
) {
  const file = fs.createReadStream(filePath, range)
  const chunks = file[Symbol.asyncIterator]()
  signal.addEventListener("abort", () => file.destroy())

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await chunks.next()
      if (done) controller.close()
      else controller.enqueue(value)
    },
    cancel() {
      file.destroy()
    }
  })
}

/**
 * Tells whether a path points at an existing file or folder, for checking paths typed into the import forms.
 *
 * @param filePath - Full absolute path, e.g. `<CONTENTS_SOURCE_DIR>/Frieren`
 * @returns `"file"`, `"directory"`, or `null` when nothing exists there (or it can't be read)
 */
export async function pathType(filePath: string) {
  const stats = await fs.promises.stat(filePath).catch(() => null)
  if (stats?.isFile()) return "file"
  if (stats?.isDirectory()) return "directory"
  return null
}
