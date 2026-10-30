# Video Streaming

The app runs on **one machine** and is used from the home LAN. Videos and their art live
on the local disk and are served by Next.js Route Handlers. There is no CDN, no HLS/DASH,
and no DRM. The player feeds the `<video>` element through **Media Source Extensions
(MSE)** with an **Object URL**, integrates with the OS through **`MediaMetadata`** (Media
Session API), and supports **Picture-in-Picture**.

## Media library on disk

Files stay where they are, outside the project, spread over several drives. Each season
lists where its audio versions are in `seasons.sources`
(`{ language, pathname, isDubbed }`), and `tests/track.spec.ts` imports from those paths.
A typical layout:

```
<CONTENTS_SOURCE_DIR>/
└── Sword Art Online/                     one content
    ├── 1/                                season 1 original: sources[] = { ja-JP, ".../1", isDubbed: false }
    │   ├── 01.mp4                        episode 1 → tracks.path (fragmented MP4, see below)
    │   ├── 02.mp4
    │   └── .original/                    --remux backups until the run succeeds (never scanned)
    ├── 2/                                season 2
    ├── Ordinal Scale.mp4                 a movie: the source is the file itself, imported as episode 1
    ├── Thai Dub/
    │   ├── 1/                            season 1 dub: sources[] = { th-TH, ".../Thai Dub/1", isDubbed: true }
    │   │   └── 01.mp4
    │   └── Ordinal Scale.mp4
    ├── Alternative Gun Gale Online/      a spinoff season, same layout under its own folder
    │   └── 1/ …
    └── Thumbnails/                       art per episode, shared by every language (never scanned by the track import)
        ├── 1/                            seasonArtDirectory: a season's season_no (even when its source is Thai Dub/1)
        │   ├── 01.webp                   episodes.thumbnail (640×360)
        │   └── 01-sprite-sheet.webp      episodes.sprite (hover preview grid)
        ├── Ordinal Scale/                a movie: its file name
        └── Alternative Gun Gale Online/  a spinoff: its folder, then its season_no
            └── 1/
```

- Paths in `sources` are explicit, so any folder naming works (`Thai Dub/1` or
  `1/Thai Dub`). A series source is a folder; a `movie` source is the `.mp4`. At most one
  source is the original (`isDubbed: false`; a season may have only dubs), and each
  language appears once. A dub other than the primary source may be listed before its
  files exist: the import skips it.
- In a folder, episode files are named **only** `01.mp4`, `14 - SP1.mp4` or
  `14 - OVA1.mp4`: the leading number is `episodes.episode_no`. `01.mp4` is a `regular`
  episode whose `episodes.title` is the name without `.mp4` (`01`); `14 - SP1.mp4` is a
  `special` titled `SP - 01`, and `14 - OVA1.mp4` an `ova` titled `OVA - 01`
  (`episodes.kind`). Two files of one source with the same number (`14.mp4` and
  `14 - SP1.mp4`) stop the import. Any other file in the folder is ignored. A movie's
  episode is a `regular` one titled by its file name.
- `episodes.thumbnail` is `<art>/<NN>.webp` and `episodes.sprite` is
  `<art>/<NN>-sprite-sheet.webp`, where `<art>` is `seasonArtDirectory(sourceDir, season)`
  (always `<contents.sourceDir>/Thumbnails/<name>`, `<name>` being a `season`'s
  `season_no` (`1`), a `movie`'s file name without `.mp4` (`Ordinal Scale`), or a
  `spinoff`/`special`'s first folder under `sourceDir` plus its `season_no`
  (`Alternative Gun Gale Online/1`), so a dub folder never shows up in it) and `NN` is the
  episode number padded like the video file (`String(episodeNo).padStart(2, "0")` → `01`).
  The art step of `tests/track.spec.ts` writes both (see
  [below](#art-step-thumbnails--sprite-sheets)). `seasons.poster` can sit anywhere. All
  are stored by full path too.
- The DB stores the **full absolute path** of every file
  (`<CONTENTS_SOURCE_DIR>/Frieren/1/01.mp4`). There's no media root in env; the drive is
  just part of the path. See [database.md](database.md#media-paths-full-paths).
- The browser only ever sees **IDs**, never paths. `sources`, `path`, `poster`,
  `thumbnail`, and `sprite` are omitted from anything sent to the client.
- Nothing from the library is copied into `public/` or the repo.

## File requirements: fragmented MP4

MSE can't play an ordinary MP4. `SourceBuffer.appendBuffer()` needs an **init segment**
(`ftyp` + `moov` with `mvex`) followed by **media segments** (`moof` + `mdat`). An
ordinary MP4, even with `+faststart`, is rejected.

`tests/track.spec.ts --remux` converts files for you (next section). The command it runs,
for reference:

```bash
ffmpeg -i 01.mp4 -map 0:v:0 -map 0:a:0? -c:v copy -c:a copy \
  -movflags +frag_keyframe+empty_moov+default_base_moof -min_frag_duration 4000000 01.remux.mp4
```

- `-c copy` copies the streams without re-encoding, so it's fast (seconds per file,
  disk-bound).
- `+frag_keyframe` starts every fragment on a keyframe, so a seek can decode from it.
  `-min_frag_duration 4000000` keeps fragments at 4 s or more; without it, a short GOP
  gives sub-second fragments (one request each).
- The project has **no subtitles**. Map only the first video and audio stream (as above)
  so subtitle streams and extra audio tracks are dropped.

### Browser-playable codecs

A remux only changes the container; it can't fix a codec the browser can't decode.

| Stream | Copied as is                               | Handled by `--remux`                                                                 | Needs a manual re-encode                       |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Video  | H.264 8-bit 4:2:0, HEVC (`hvc1`), AV1, VP9 | HEVC tagged `hev1` → `-tag:v hvc1`                                                   | H.264 10-bit (Hi10P) or 4:2:2/4:4:4, MPEG-2, … |
| Audio  | AAC, Opus                                  | anything else → AAC, channels kept (5.1 stays 5.1), 64 kb/s per channel (≥ 192 kb/s) | —                                              |

- H.264 8-bit + AAC plays everywhere. HEVC needs Safari or a Chromium browser with
  hardware decode, and Firefox mostly can't play it. Safari plays HEVC only when it's
  tagged `hvc1`.
- For a video re-encode, run ffmpeg by hand:
  `-c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k`, plus the `-movflags` above.

### Import step: `tests/track.spec.ts`

```bash
bun tests/track.spec.ts --season <seasonId> [--remux] [--force]
```

One run does the whole season, in order: check ffmpeg/ffprobe and the art folder → scan
`sources` → remux (`--remux`) → read every file → write episodes and tracks (one
transaction) → art (next section). Any check that fails stops the run before the step that
would change something. The entry file only runs the steps; the parts live in
`tests/tracks/` (`source.ts` scanning, `mp4.ts` + `codec.ts` box parsing and codec
strings, `ffprobe.ts`, `ffmpeg.ts` remux + WebP writing, `thumbnail.ts`, `sprite.ts`,
`constants.ts`, `utils.ts`, `validator.zod.ts`).

The import upserts one `episodes` row per episode number and one `tracks` row per file. It
is safe to re-run: episodes upsert on `(season_id, episode_no)`, tracks on
`(episode_id, language)`.

- Original vs dub comes from `isDubbed` alone, never from the folder name. A season may
  have only dubs (no `isDubbed: false` source); its first source then stands in for the
  original (`primarySource` in `src/libs/media.ts`).
- A dub source that isn't on disk is skipped with a warning; a missing primary source (the
  original, or the first dub when there's none) stops the run.
- A dub with fewer episodes than the original (the dub is still airing) just gives those
  episodes a second track; the rest play the original. Re-run the script when more dubbed
  episodes land.
- `--remux` first checks every file. If any needs a video re-encode, or its `.original/`
  slot is already taken, it lists them and stops with nothing changed. Then each file that
  isn't a fragmented MP4, has non-AAC/Opus audio, or is tagged `hev1` is remuxed to
  `01.remux.mp4`. The output is checked (fragmented, duration within 1 s of the original);
  then the original moves to `.original/01.mp4` and the output is renamed to `01.mp4`.
  Once the whole run has succeeded (every file read back, imported, and given its art),
  the season's backups are deleted and an emptied `.original/` with them. If any step
  fails, they stay so the originals can be restored; a later successful `--remux` run
  deletes them. Only this season's files are touched, since a folder of movies can hold
  other seasons' backups.
- Without `--remux`, a file that isn't fragmented stops the run.
- Every file is read before anything is written to the DB, so one bad file doesn't leave a
  half-imported season.

| Column                  | How                                                                                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`                  | full absolute path, forward slashes, inside (or, for a movie, equal to) its source's `pathname`                                                                                                                                              |
| `language`, `is_dubbed` | copied from the season source the file came from                                                                                                                                                                                             |
| `mime_codec`            | read from each track's `stsd` sample entry (`avcC`, `hvcC`, `av1C`, `vpcC`, `esds`): `video/mp4; codecs="avc1.640028, mp4a.40.2"`. ffprobe doesn't print RFC 6381 codec strings                                                              |
| `duration_seconds`      | from `ffprobe`, rounded                                                                                                                                                                                                                      |
| `width`, `height`       | from `ffprobe`                                                                                                                                                                                                                               |
| `size_bytes`            | `fs.stat`                                                                                                                                                                                                                                    |
| `init_end`              | byte offset where the first `moof` starts (init segment = `0 … init_end - 1`)                                                                                                                                                                |
| `fragments` (jsonb)     | `[{ start, end, time, duration }]`: walk the top-level boxes; each `moof` + its `mdat` is one fragment (`end` inclusive). `time` = the video track's `tfdt` ÷ its `mdhd` timescale; `duration` = next `time` (or the file duration) − `time` |

Computing the fragment index once at import time lets the player seek with a binary search
instead of parsing the file in the browser.

### Art step: thumbnails & sprite sheets

The last step of `tests/track.spec.ts`. For each imported episode it reads a dubbed file
(`isDubbed: true`, the first by language) when the episode has one, otherwise its original
(`isDubbed: false`), and writes into the season's art folder (`seasonArtDirectory`). The
DB is updated per episode, right after its files.

- **Thumbnail** `<NN>.webp`, 640×360: one frame at `intro.to + 30` s if the episode has an
  intro skip, otherwise at 25 % of the duration (past black frames and the opening). An
  existing file is kept unless `--force`, so a hand-picked thumbnail survives re-runs.
- **Sprite sheet** `<NN>-sprite-sheet.webp`: one 192×108 tile every `interval = 10` s,
  `columns = 10`, `count = ceil(duration / interval)`, `rows = ceil(count / columns)`.
  WebP is capped at 16383 px per side, so raise `interval` (by 5 s) until `rows × 108`
  fits (only past ~4.2 h of video).

  ```bash
  ffmpeg -skip_frame nokey -i 01.mp4 -an \
    -vf "tpad=stop_mode=clone:stop_duration=20,fps=1/10,trim=end_frame=143,scale=192:108:force_original_aspect_ratio=decrease,pad=192:108:(ow-iw)/2:(oh-ih)/2,setsar=1,tile=10x15" \
    -frames:v 1 -c:v libwebp -quality 60 01-sprite-sheet.tmp.webp
  ```

  `-skip_frame nokey` decodes keyframes only, which is several times faster (about 3 s per
  24-minute 1080p episode); a tile can be off by one GOP (2–4 s), which is fine for a
  preview. The last keyframe can fall well before the end (10 s early on the test files),
  so `fps` alone comes up one tile short: `tpad` repeats the last frame and
  `trim=end_frame=<count>` cuts to exactly `count` tiles, so the sheet always matches the
  grid in the DB. A 24-minute episode gives 143 tiles, 1920×1620 px, about 50–65 KB.

- An existing sprite is kept when the grid in the DB matches; `--force` regenerates it.
- Both are remade, without `--force`, when the art track is new: before the upsert the
  import reads each episode's track languages from the DB, and an episode that had tracks
  but none in the art track's language has art from another track (its dub landed after
  the original). That replaces a hand-picked thumbnail too. A dub missing from disk for
  one run doesn't trigger it, since the original it falls back to is already in the DB.
- 192×108 matches the design's ~200 px hover preview, shown 1:1 (scaling a smaller tile up
  blurs it). The player reads the tile size from `spriteGrid`, so changing it needs no
  player change: a re-run without `--force` regenerates every sprite whose stored grid
  differs, and keeps the thumbnails.

- Write to `*.tmp.webp`, then rename over the target, so a crash never leaves a
  half-written image.
- After each episode, save the full forward-slash paths in `episodes.thumbnail`
  (`thumbnail_path`) / `episodes.sprite` (`sprite_sheet_path`) and the grid in
  `episodes.spriteGrid` (`sprite_sheet_grid`, `Content.SpriteGrid`:
  `{ interval, width, height, columns, count }`). Only the grid is sent to the player;
  tile `i` shows `i × interval` seconds.
- A running server keeps serving cached readers (`cacheLife("hours")`) until they expire
  or it restarts.

## Route Handlers

| Route                            | Returns                                       | Auth                                                   |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| `GET /api/stream/[vid]`          | Video bytes, HTTP Range → `206`               | Cookie token → `401` if invalid                        |
| `GET /api/stream/[vid]/manifest` | `{ mimeCodec, duration, initEnd, fragments }` | Cookie token                                           |
| `GET /api/art/[kind]/[id]`       | `image/webp` / `image/png` / `image/jpeg`     | None (see [Art route](#art-route-posters--thumbnails)) |
| `POST /api/progress`             | `204`, upserts `watch_histories` (beacon)     | Cookie token                                           |

In the stream routes, `vid` is `tracks.id` (UUID); only the player calls them. (The watch
page's `?vid=` is an episode, see below.) Validate it with `paramValidator` (`z.uuid()`)
from `@/libs/validator.zod` before querying.

### Video bytes: `/api/stream/[vid]`

```ts
import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import type { NextRequest } from "next/server"

import { isSafeMediaPath } from "@/libs/media"

const MAX_CHUNK = 4 * 1024 * 1024

export async function GET(request: NextRequest, ctx: RouteContext<"/api/stream/[vid]">) {
  const { vid } = await ctx.params

  ...authenticate from the cookie → 401
  ...validate vid as UUID, look up the track and its language's source `root` (cached reader) → 404

  if (!track.root || !isSafeMediaPath(track.path, track.root, [".mp4"])) {
    return new Response(null, { status: 403 })
  }

  const filePath = path.resolve(track.path)

  const size = track.size
  const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "")
  const start = match?.[1] ? Number(match[1]) : 0
  const end = Math.min(match?.[2] ? Number(match[2]) : start + MAX_CHUNK - 1, size - 1)

  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } })
  }

  const stream = fs.createReadStream(filePath, { start, end })
  request.signal.addEventListener("abort", () => stream.destroy())

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 206,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=86400"
    }
  })
}
```

Rules:

- **Never accept a path from the client.** Look the path up by ID, then check it with
  `isSafeMediaPath` (in `@/libs/media`, shared by the stream and art routes) before
  opening it. The check must:
  - reject a path that isn't absolute or contains `..` segments,
  - resolve the path and require it to equal its root or start with the root + `/`
    (case-insensitive, after normalizing to forward slashes),
  - require an allowed extension (`.mp4` for video; `.webp`, `.png`, `.jpg`, `.jpeg` for
    art).

  The root is the `pathname` of the season source in the track's language (a folder, or a
  movie's file) for a video, and `seasonArtDirectory(sourceDir, season)` for a thumbnail
  or sprite. A missing root is a rejection, never a skipped check: only a poster passes
  `null`.

  Even though only the import step writes paths, this keeps a bad row from turning a route
  into a file reader for the whole disk.

- **Stream, never buffer**: no `fs.readFile` on a video.
- Destroy the file stream when the request aborts. The player aborts fetches on every
  seek.
- Cap open-ended ranges (`bytes=123-`) at `MAX_CHUNK`.
- Return `401`/`403` yourself. Don't use `withAuth` here, because it redirects.
- Don't wrap byte responses in `"use cache"`. Do cache the **track lookup**
  (`readTrack(vid)` with `"use cache"` + `cacheTag(\`tracks/${vid}\`)`), since every chunk
  request needs it.
- Without a `Range` header, still return `206` for the first chunk. Native `<video src>`
  playback then works as the fallback (see below).

### Art route: posters & thumbnails

`/api/art/[kind]/[id]` with `kind` in `poster | thumbnail | sprite`:

| `kind`      | `id`          | Path column          |
| ----------- | ------------- | -------------------- |
| `poster`    | `seasons.id`  | `seasons.poster`     |
| `thumbnail` | `episodes.id` | `episodes.thumbnail` |
| `sprite`    | `episodes.id` | `episodes.sprite`    |

A sprite sheet is drawn as a CSS background with `background-position` per tile, **not**
through `next/image`: the optimizer would resize the whole sheet and the tile offsets
would no longer match.

1. Validate `kind` with a Zod enum and `id` as a UUID. Look up the path (plus the season's
   art folder, or `null` for a poster) with a cached reader, run `isSafeMediaPath` with
   the image extensions, and return `404` if it's missing.
2. Map the extension to a type: `.webp → image/webp`, `.png → image/png`,
   `.jpg`/`.jpeg → image/jpeg` (`image/jpg` is not a valid MIME type). Reject anything
   else.
3. Stream the file with `Content-Length`, an `ETag` built from `size-mtimeMs`, and
   `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`. Answer
   `If-None-Match` with `304`.
4. **No auth on this route.** The `next/image` optimizer fetches the image server-side
   **without the user's cookies**, so an authenticated art route would make every
   optimized image fail. Art isn't sensitive, and the app is private to the home LAN. The
   route still takes only IDs, never paths.

Render art with `next/image` and allow the route in `next.config.ts`:

```ts
images: {
  qualities: [25, 50, 75, 100],
  localPatterns: [{ pathname: "/api/art/**", search: "" }]
}
```

**Is it slow?** Reading a few hundred KB from a local disk takes milliseconds. The DB
lookup is cached, so that isn't the problem either. The real cost is **image size**: a
3000 px PNG poster shown at 200 px in a 50-poster grid adds up to tens of MB. With
`next/image`, Next resizes to the requested width and converts to WebP/AVIF on the
**first** request, which takes noticeable time. The result is cached in
`.next/cache/images`, so later requests are fast, and the browser cache serves repeats
with no request at all. Recommendations:

- Always go through `next/image` with accurate `sizes`. Never use a raw
  `<img src="/api/art/...">` for grids.
- Keep source art reasonable: posters about 600×900 and thumbnails about 640×360, in WebP.
  Then even the first request is cheap.
- If first-load latency still bothers you, pre-generate the sizes at import time and serve
  them with `unoptimized`.

## Watch page: `/watch?vid=<episodeId>&audio=<locale>&t=<seconds>`

The watch route takes its state from **search params**:
`app/(protected)/watch/validator.nuqs.ts`

```ts
export const queryValidator = createSearchParamsCache({
  vid: parseAsString, // episodes.id
  audio: parseAsStringEnum<Locales>(Object.values(Locales)),
  t: parseAsInteger
})
```

- **`vid` is the episode, not a track**, so an episode's URL is the same in every
  language. `audio` (optional) asks for a track by language; the server picks with
  `pickTrack`: `audio`, then `preferences.audio_language`, then the original audio, then
  the first track.
- The page (plain SSR, no Suspense) parses the params and validates `vid` as a UUID. It
  does **not** call `notFound()`: it returns `<WatchNotice kind="invalid-link" />` when
  `vid` is missing or not a UUID, and `<WatchNotice kind="not-found" />` when no episode
  has that ID or it has no track yet. Before anything else, `browserNotice(userAgent)`
  (`watch/utils.ts`, from the request's `User-Agent`) returns
  `<WatchNotice kind="in-app-browser" />` for an in-app browser (LINE, X, Discord, any
  app's web view) and `<WatchNotice kind="unsupported-browser" />` for Safari or Firefox:
  the player supports Chromium browsers only. `watch-notice.tsx` is an inline message box
  in the player's place (a link back to `/browse`), not a modal. It loads the episode with
  all its tracks (`readWatchEpisode`), then every episode of the content, the saved
  progress, and the preferences with `Promise.all`, picks the track, and renders **only
  the player**. There is no episode list under it: episodes are listed in the player's
  Playlist drawer, passed in as props.
- **Prev / Next stay in the language being played.** A neighbor without a track in that
  language counts as missing (`null`): a Thai dub that stops at episode 6 has no next
  episode, even though the original goes on. That episode is passed as `nextFallback` (in
  the language it would play) so the end card can ask "Watch in Original" instead of
  switching the audio silently; there is no autoplay countdown in that case.
- `startAt` = `t` if present, otherwise the saved `position_seconds` **if the content's
  `watch_histories` row points at this episode and isn't completed**, otherwise `0`.
- Episode links are `` `/watch?vid=${episode.id}&audio=${language}` `` (the language being
  played, so it carries over; an audio switch adds `&t=` and uses `router.replace`). Next
  16 keeps a page's client state when only its search params change, so the player stays
  mounted across episodes. **Keep one `<video>` element for the whole visit**: the
  persistent `<Lmp>` owns the container and `<video>`, and per-episode state lives in
  `<LmpSession key={track.id}>`, which detaches the old MediaSource and attaches the new
  one to the same element. Never put a `key` on the element that holds `<video>`: a new
  element closes Picture-in-Picture and leaves fullscreen.
- Extra params the page may use later also go in `validator.nuqs.ts`. Update the URL from
  the client with nuqs `useQueryStates` (`shallow: true` for UI-only changes).

## Player: MediaSource + Object URL

The player is a Client Component in `app/(protected)/watch/components/`. Its MSE logic
lives in a route-local hook `use-media-source.ts` next to it. Load the player with
`next/dynamic`.

### Setup

```ts
const MediaSourceImpl = window.ManagedMediaSource ?? window.MediaSource

if (!MediaSourceImpl?.isTypeSupported(manifest.mimeCodec)) {
  video.src = `/api/stream/${vid}`
  return
}

const mediaSource = new MediaSourceImpl()
const objectUrl = URL.createObjectURL(mediaSource)
video.disableRemotePlayback = true
video.src = objectUrl

mediaSource.addEventListener("sourceopen", () => {
  URL.revokeObjectURL(objectUrl)
  mediaSource.duration = manifest.duration
  const sourceBuffer = mediaSource.addSourceBuffer(manifest.mimeCodec)
  sourceBuffer.mode = "segments"
  ...append the init segment (bytes 0 … initEnd - 1), then start the buffer loop
}, { once: true })
```

The type check above falls back to native playback (`video.src = "/api/stream/<vid>"`),
which works because the stream route supports Range requests. `ManagedMediaSource` is
required on iOS Safari and needs `disableRemotePlayback = true`.

### Rules

- **One append at a time.** Never call `appendBuffer` / `remove` while
  `sourceBuffer.updating` is true. Queue the work and continue on `updateend`.
- **Buffer ahead about 30 s.** On `timeupdate`, if `bufferedEnd - currentTime < 30`, fetch
  the next fragment with `fetch(url, { headers: { Range: "bytes=start-end" }, signal })`.
- **Evict behind.** Call `sourceBuffer.remove(0, currentTime - 30)` periodically. On
  `QuotaExceededError`, evict and retry the append. Without eviction, a long episode will
  hit the quota.
- **Seeking.** On `seeking`, abort the in-flight fetch (`AbortController`). Binary-search
  `fragments` for the fragment containing `currentTime`, and load from there unless that
  range is already buffered.
- **End of stream.** After the last fragment is appended and `updateend` fires, call
  `mediaSource.endOfStream()`.
- **Errors.** On `video.error` or a failed fetch, retry a fragment twice. If it still
  fails, fall back to native `src` playback from the current position.
- **Cleanup on session unmount** (episode or language change, the effect's return): abort
  fetches, remove listeners, and if `mediaSource.readyState === "open"`, call
  `endOfStream()`. Revoke the Object URL if `sourceopen` never fired. Don't reset the
  element: the next session sets `video.src` to its own Object URL right away, and
  assigning `src` already runs the load algorithm.
- **Cleanup on player unmount** (leaving `/watch`): exit PiP if this video is the PiP
  element, then run `video.removeAttribute("src")` and `video.load()`.
- Resume by setting `video.currentTime = startAt` after `loadedmetadata`. The seeking
  logic then loads the right fragment.
- Keep the MSE state (queue, controller, sourceBuffer) in **refs**, not React state, so
  time updates don't re-render the player.

## Media Session (`MediaMetadata`)

This makes OS media controls, keyboard media keys, the lock screen, and the PiP window
show the episode and control the player.

```ts
if ("mediaSession" in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: `E${episode.episodeNo} · ${episode.title ?? ""}`,
    artist: content.title,
    album:
      season.title ??
      (season.seasonNo === null ? content.title : `Season ${season.seasonNo}`),
    artwork: [
      { src: `/api/art/thumbnail/${episode.id}`, sizes: "640x360", type: "image/webp" },
      { src: `/api/art/poster/${season.id}`, sizes: "600x900", type: "image/webp" }
    ]
  })

  navigator.mediaSession.setActionHandler("play", () => video.play())
  navigator.mediaSession.setActionHandler("pause", () => video.pause())
  navigator.mediaSession.setActionHandler("seekbackward", (details) =>
    seekBy(-(details.seekOffset ?? 10))
  )
  navigator.mediaSession.setActionHandler("seekforward", (details) =>
    seekBy(details.seekOffset ?? 10)
  )
  navigator.mediaSession.setActionHandler("seekto", (details) =>
    seekTo(details.seekTime ?? 0)
  )
  navigator.mediaSession.setActionHandler(
    "previoustrack",
    prevVid ? () => goTo(prevVid) : null
  )
  navigator.mediaSession.setActionHandler(
    "nexttrack",
    nextVid ? () => goTo(nextVid) : null
  )
}
```

- Call `navigator.mediaSession.setPositionState({ duration, position, playbackRate })` on
  `loadedmetadata`, `seeked`, and `ratechange`, and at most once per second while playing.
  Never call it with `position > duration`.
- Keep `playbackState` in sync (`"playing"` / `"paused"`).
- On unmount, set every handler back to `null` and `metadata` to `null`. Otherwise a stale
  handler controls a dead player.
- Wrap each `setActionHandler` in `try/catch`: browsers throw for actions they don't
  support.
- `goTo(target)` navigates with
  `router.push(\`/watch?vid=${target.episodeId}&audio=${target.language}\`)`.

## Picture-in-Picture

```ts
const isPipSupported = document.pictureInPictureEnabled && !video.disablePictureInPicture

async function togglePictureInPicture() {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture()
  } else {
    await video.requestPictureInPicture()
  }
}
```

- Show the PiP button only when `isPipSupported`. Call `requestPictureInPicture()` **only
  from a user gesture** (click or keyboard shortcut `Shift+I`), or it rejects. Firefox has
  no `requestPictureInPicture()`, so the button is hidden and the shortcut shows a "not
  supported" message there.
- Track the state with the `enterpictureinpicture` / `leavepictureinpicture` events, not
  by assuming the promise succeeded.
- The PiP window's play/pause and next/previous buttons come from the Media Session
  handlers above.
- PiP stays open across episodes because the `<video>` element is reused (see the watch
  page above). Exit PiP only when the player itself unmounts (leaving `/watch`) or on
  Stop. A session reads its starting state from
  `document.pictureInPictureElement === video`, since PiP may carry over from the previous
  episode.
- (Optional, Chromium only) `documentPictureInPicture` allows custom controls in the PiP
  window. Feature-detect it and treat it as an enhancement.

## Player UI & preferences

**Design reference: `docs/design/LMP.png`** (the player, the Preferences popover, the end
card, the hover preview). Follow it when drawing the player; the older `00-Overview.png`,
`01-Actions.png`, and `02-Playlist.png` show the previous layout, and
`docs/design/references/` is inspiration only. Full spec in
`notes/lumine-media-player.md`, redesign in `notes/new-lmp-spec.md`.

- The player fills the viewport (`h-dvh w-full bg-black`, video `object-contain`), with no
  rounded corners. Set `poster="/api/art/thumbnail/<episodeId>"`, `playsInline`, and
  `preload="metadata"`. On a touch device it opens in fullscreen: on mount when the
  browser still counts the tap that led there, otherwise at the first tap on the player.
  iPhone, whose only fullscreen is the native video player, is left alone.
- **No UI library inside the player** (no shadcn/ui or Animate UI; Animate UI's `motion.*`
  would also throw under `LazyMotion strict`): plain `<button>`s, and framer-motion for
  the drawers, the Preferences popover, and its switches (`LazyMotion` with the features
  loaded on demand, `m` components only, `MotionConfig reducedMotion="user"`). Icons come
  from `@keyline-icons/react/fill`, except the 10-second seek icons in `lmp/icons`.
  Buttons and panels are dark glass with the `border-gradient` edge
  (`src/styles/components/border-gradient.css`), and **draw no focus outline** (`.lmp` in
  `globals.css`): keyboard focus lightens the fill and the edge instead.
- Layout: a top bar (Back to the content page; the content title over
  `Season 1 • Episode 01`; on the right mute, PiP, fullscreen, Playlist, Preferences); the
  playback buttons in the middle of the player (−10, previous, play-pause, next, +10; play
  becomes replay once the episode ended); elapsed time and duration over the progress bar
  at the bottom (`mm:ss`, or `h:mm:ss` from 1 h). Messages are a toast at the top center.
  There is **no Stop button** (Shift+S only) and **no volume slider**: ↑ / ↓ change the
  volume, the speaker button mutes. Played progress is white.
- Only the controls themselves take the pointer, so a tap anywhere else on the player
  shows or hides them.
- UI copy is English, as in the design ("Skip intro", "Preferences", "Audio Language",
  "Playlist"). The audio menu names a language in English, then in itself:
  `Japanese (日本語)`, `Thai (ไทย)`; other messages use the endonym (`No ไทย audio`).
- The Preferences popover opens under its button: the Autoplay Next, Auto Skip, and Stable
  Volume switches, then "Audio Language" (the episode's tracks, when there is more than
  one), then Keyboard shortcuts. Escape or a click outside closes it.
- The Playlist and the keyboard shortcut list open in the player's own `Drawer` (from the
  right on `lg` and up, from the bottom below), rendered inside the player container so
  they show in fullscreen. The Playlist lives in the persistent part of the player, so it
  stays open after picking an episode.
- Per-device settings (volume, muted, Stable Volume) go in a dedicated zustand store
  `stores/player/`, persisted to `localStorage`. Stable Volume doesn't change the sound
  yet (`notes/lmp-stable-volume-plan.md`). Per-account settings (audio language,
  autoplay-next, auto-skip) live in the `preferences` table. The server reads them when it
  picks the track, and passes them to the player as props.
- The page title (`generateMetadata`) is `EP 01 • Season 1 • Content title`; a season with
  a title reads `Title (S2)`.
- Auto-skip: when `preferences.auto_skip` is on, seek to `to` as soon as `currentTime`
  enters a skip range instead of showing the button.
- Keyboard (Lumine Media Player, full plan in `notes/lumine-media-player.md`): Space
  play/pause, Shift+S stop, Shift+M mute, ↑/↓ volume ±5 %, ←/→ seek ±10 s, Shift+←/→ seek
  ±30 s, Shift+P / Shift+N previous / next episode, Shift+F fullscreen, Shift+I
  picture-in-picture. Listen on `window` (capture phase) so keys work without focusing the
  player. Match `event.code` + `shiftKey`, not `event.key`, so the Thai layout and Caps
  Lock don't break them. Skip events with Ctrl/Alt/Meta (browser shortcuts) or
  `isComposing`. Prevent default on Space keydown **and** keyup, or a focused button is
  clicked too. The watch page has no inputs, so there is no input-focus guard. Shift+/
  opens a shortcut list rendered from the same `HOTKEYS` table the handler uses.
- Pointer: clicking the video does nothing (play / pause only from the buttons and
  shortcuts), and there is no double-click action. On touch, a tap toggles the controls;
  there is no double-tap seek (the ±10 s buttons are always shown).
- Skip buttons come from `episodes.skips` (`Content.Skip[]`:
  `{ kind: "intro" | "outro" | "recap", from, to }` in seconds). Show "Skip intro" / "Skip
  recap" while `from ≤ currentTime < to`. When an `outro` starts, offer `nextVid`. The
  server already provided it, so nothing is fetched on `ended`.

## Watch progress

- Save at most every 15 s while playing, plus on `pause`, `seeked`, `ended`, and
  `visibilitychange` → hidden / `pagehide`.
- Send with `navigator.sendBeacon("/api/progress", blob)`: it survives page unload, and
  Server Actions don't. The handler validates the body with Zod (`{ trackId, position }`;
  the duration comes from the track in the DB), authenticates from the cookie, looks up
  the track's `episode_id` and `content_id` on the server, and upserts `watch_histories`
  with `onConflictDoUpdate({ target: [accountId, contentId] })`, setting `episode_id`, the
  position, and `watched_at = now()` (no track: which audio played isn't kept). There is
  one row per account per content, so moving to another episode overwrites it.
- Set `completed_at` when position ≥ 90 % of the duration (credits), and clear it when a
  new episode starts.
- The "Continue watching" row reads the account's `watch_histories` ordered by
  `watched_at desc` (index `(account_id, watched_at desc)`), joined to episode → season →
  content:
  - not completed → resume that episode at `position_seconds`: `/watch?vid=<episode_id>`
    (no `audio`: `pickTrack` uses the account's audio preference);
  - completed and a next episode exists → offer the next episode from `0`;
  - completed on the last episode → hide the row.

  It's per-user, so query it directly and don't remote-cache it.
