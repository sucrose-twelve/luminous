# Web Performance

The app is a private home-LAN app and renders with **plain SSR** (no Suspense, no
skeletons), so a page appears when the server has finished it. That trade-off is accepted.
Performance work here means **keeping server render time short** and **keeping the client
light**, not streaming.

Don't judge speed from `next dev`. Measure a production build
(`bun run build && bun run start:prod`). The server log (`logging.incomingRequests`) shows
each request's duration.

## Targets

| Metric                        | Target                            | What usually breaks it here                                 |
| ----------------------------- | --------------------------------- | ----------------------------------------------------------- |
| Server render time (per page) | < 200 ms on localhost             | Sequential awaits, N+1 queries, uncached catalogue reads    |
| INP (interaction → paint)     | < 200 ms                          | Heavy client components, re-renders from broad selectors    |
| CLS (layout shift)            | < 0.1                             | Images/video without a reserved aspect ratio                |
| Time to first frame (watch)   | < 1 s                             | Non-fragmented MP4, big first fragment, player JS too large |
| Seek → frame                  | < 500 ms                          | No fragment index, not aborting the previous fetch          |
| First-load JS per route       | Keep it small; check build output | `"use client"` too high, framer-motion loaded eagerly       |

## 1. Server rendering — make the wait short

The user sees nothing (except the top loader bar) until the page finishes on the server,
so every millisecond of render time is visible.

- **Parallelize.** Run independent queries with `Promise.all`. Await in sequence only when
  one query needs the other's result.
- **Cache catalogue reads** (contents, seasons, episodes, tracks, art paths) with
  `"use cache"` + `cacheTag` + `cacheLife("hours" | "days")`, and invalidate by tag on
  change. Per-user data (progress, watchlist) is queried directly, because it's cheap with
  the right index.
- **Fewer, better queries.** Use joins or `inArray` + `groupBy`, never a query per item
  (see 6).
- **Keep layouts cheap.** A layout runs on every navigation into its segment. The
  `(protected)` layout's auth check must stay fast: decryption is cached in Redis, and the
  account lookup is cached by tag.
- Don't do work at render time that could be done once at import time: fragment indexes,
  codec strings, durations, and image sizes all belong to the import step.
- Keep `export const instant = false` in the root layout. It allows the blocking SSR
  model. Don't chase `instant` validation warnings.

## 2. JavaScript — ship less of it

- Server Components by default. Use `"use client"` only on interactive leaves (player,
  search input, hover card). Pass server-rendered children into client wrappers instead of
  converting the wrapper's subtree.
- Lazy-load heavy client code with `next/dynamic`: the video player and its MSE hook,
  framer-motion features (`LazyMotion` + `domAnimation`), modals.
- Animate UI components are the one accepted eager `motion` import (they render
  `motion.*`). Use them where the UI needs them, and check the route's first-load JS in
  the build output when one lands on a new route.
- Import named functions (`import { debounce } from "es-toolkit"`, single Hugeicons),
  never whole libraries.
- Never import `@/drizzle`, `@/libs/cipher`, or `@/constants/env` from client code. It
  bloats the bundle and leaks secrets.
- Check the per-route sizes printed by `bun run build` after adding a dependency or a
  `"use client"` file.

## 3. React — avoid wasted renders (no React Compiler)

- Memoize manually: `useCallback` for handlers passed down or used in effects, `useMemo`
  for derived arrays/objects and for objects returned from hooks. Wrap list items in large
  grids with `React.memo`.
- zustand: select the smallest slice. Use `useShallow` for multi-field selects.
- `timeupdate` fires about 4× per second. Keep `currentTime`, the MSE queue, and the
  `SourceBuffer` in **refs**. Only the progress bar subscribes to time, throttled with
  `requestAnimationFrame`.
- Debounce search input (about 300 ms) and throttle scroll/resize handlers (es-toolkit).
- Use `useTransition` for filter changes so typing stays responsive during the server
  round-trip.
- Use passive listeners for scroll/touch. Clean up every listener, interval, observer, and
  `AbortController`.

## 4. Images (art from the media drives via `/api/art`)

- Always use `next/image` with `width`/`height` (or `fill` inside an `aspect-*` box) and
  an accurate `sizes`, e.g. for a 6-column poster grid:
  `sizes='(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 16vw'`. Next resizes and
  converts once, then serves from `.next/cache/images`.
- Keep the source art small (posters about 600×900, thumbnails about 640×360, WebP).
  Oversized source files make the **first** optimization slow.
- The art route sends `ETag` + `Cache-Control` so repeat views never hit the disk (see
  [video-streaming.md](video-streaming.md#art-route-posters--thumbnails)).
- `preload` (replaces `priority` in Next 16) goes **only** on the main hero/banner image.
  Everything else lazy-loads by default.
- `quality` must be one of `25 | 50 | 75 | 100`: 75 for posters, 50 for blurred
  backgrounds.
- For rows of 50+ posters, also consider `content-visibility: auto` with
  `contain-intrinsic-size` on off-screen rows.

## 5. Video (MSE)

- Files must be **fragmented MP4** with about 4 s fragments. The fragment index is
  computed at import time, so seeking is a binary search plus one Range request.
- Start fast: append the init segment and the first fragment right away. Only then build
  the 30 s buffer ahead.
- Abort the in-flight fetch on every seek (`AbortController`). The server destroys the
  file stream on abort, so seeks don't pile up disk reads.
- Evict the buffer more than 30 s behind `currentTime` to stay under the `SourceBuffer`
  quota.
- Cap Range responses (4 MB) and cache the track lookup used by every chunk request.
- `poster` + `aspect-video` so the player box paints immediately.
- Prefetch the next episode's **metadata** (already in the SSR props), not its video.
- `setPositionState` for the Media Session runs at most once per second.

## 6. Data and database

- Select columns with `pick` / `omit` over the `table-columns` sets
  (`db.select(pick(contentColumns, [...]))`). Never send whole rows to a component.
- **One query per list**: a join, or `inArray(ids)` + `groupBy`. A query inside `.map()`
  is an N+1 bug.
- Index every foreign key and every column used in `where` / `orderBy` on hot paths
  (`episodes.season_id`, `tracks.episode_id`,
  `watch_histories (account_id, watched_at desc)`).
- Use keyset pagination for long, growing lists ("continue watching", history). Offset is
  fine only for small pages.
- Use `"use cache"` (in-memory) for catalogue reads. Reserve `"use cache: remote"` (Redis)
  for expensive work with few distinct keys (decrypted tokens, genre facet counts).
- The `postgres` client is created once in `src/drizzle/index.ts`. Never create clients
  per request.

## 7. Navigation

- The top loader bar (`@/components/link` + `loader.tsx`) is the only navigation feedback.
  Use `Link` from `@/components/link` for in-app links so it always shows.
- `next/link` prefetches visible links in production. For grids with many cards, set
  `prefetch={false}` so the server doesn't render dozens of pages on scroll. Keep the
  default for primary nav.

## 8. CSS

- Tailwind v4 generates only the utilities it finds, so keep classes as static strings (no
  `` `bg-${color}` ``).
- Animate only `transform` and `opacity`. Avoid animating `width`/`height`/`top`, which
  causes layout thrash. The loader bar animates `width` on a fixed 2px element, which is
  acceptable, but don't copy that pattern for large elements.
- Honour `prefers-reduced-motion` with `motion-safe:` / `motion-reduce:`.

## Performance review checklist

Before calling a user-facing change done:

- [ ] Independent queries run in `Promise.all`; no N+1; explicit columns; indexes exist
      for new filters.
- [ ] Catalogue data is cached with `"use cache"` + `cacheTag` + `cacheLife`; mutations
      invalidate tags.
- [ ] No new `"use client"` higher than necessary; heavy client code is dynamically
      imported.
- [ ] Images go through `next/image` with `sizes` and a reserved aspect ratio.
- [ ] Player state that changes per frame lives in refs; effects clean up fetches and
      listeners.
- [ ] `bun run build` passes; route JS size didn't jump unexpectedly.
