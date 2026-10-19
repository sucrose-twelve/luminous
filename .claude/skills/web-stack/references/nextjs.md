# Next.js 16 in this project

This is Next.js **16.4** with **Cache Components** on. It behaves differently from Next.js 13–15. Before using
an API you're unsure about, read its page under `node_modules/next/dist/docs/01-app/`:

| Topic                       | Doc                                                                    |
| --------------------------- | ---------------------------------------------------------------------- |
| Caching model               | `01-getting-started/08-caching.md`                                     |
| `use cache` / remote        | `03-api-reference/01-directives/use-cache*.md`                         |
| Auth + Cache Components     | `02-guides/authentication-with-cache-components.md`                    |
| Blocking routes (`instant`) | `…/route-segment-config/instant.md`, `02-guides/instant-navigation.md` |
| Route Handlers              | `03-api-reference/03-file-conventions/route.md`                        |
| Proxy (was middleware)      | `01-getting-started/16-proxy.md`                                       |
| Mutations / Server Actions  | `01-getting-started/07-mutating-data.md`, `02-guides/forms.md`         |

## Things that changed and trip people up

- **`middleware.ts` is now `proxy.ts`** (in `src/`, exporting `proxy`). Use it only for cheap, optimistic
  checks (e.g. "no auth cookie → redirect to sign-in"). Never decrypt tokens or hit the DB there.
- **`params` and `searchParams` are Promises.** Always `await` them. Use the project's `NextParams<{ … }>` /
  `NextSearchParams` types; `RouteContext<"/api/…">` is available for Route Handlers.
- **`cookies()`, `headers()`, `draftMode()` are async.**
- **This app renders with plain blocking SSR** (see [Rendering](#rendering-plain-ssr)). The root layout's
  `export const instant = false` allows that. Without it, Cache Components requires a `<Suspense>` boundary
  around every runtime read.
- **`"use cache"` replaces `unstable_cache`, `fetch` cache options, and `export const revalidate`.** Segment
  configs like `dynamic`, `revalidate`, `fetchCache` don't apply with Cache Components.
- **`revalidateTag(tag, profile)` requires a second argument** (`"max"` recommended, or `{ expire: 0 }`).
  Inside Server Actions prefer **`updateTag(tag)`** — it expires immediately so the user sees their own
  change.
- `next/image`: `priority` is replaced by `preload`; allowed `quality` values are limited to
  `[25, 50, 75, 100]` by `next.config.ts`.

## Caching model

Three directives, pick deliberately:

| Directive              | Stored       | Can read cookies/headers | Use for                                                   |
| ---------------------- | ------------ | ------------------------ | --------------------------------------------------------- |
| `"use cache"`          | In-memory    | No — pass as arguments   | Catalogue data (contents, seasons, episodes, tracks)      |
| `"use cache: remote"`  | Redis        | No — pass as arguments   | Expensive request-time work with low-cardinality keys     |
| `"use cache: private"` | Browser only | Yes                      | Per-user data you can't refactor to pass IDs as arguments |

Rules:

- Always pair a cache directive with `cacheLife(...)` and `cacheTag(...)`:

```ts
import { eq } from "drizzle-orm"
import { omit } from "es-toolkit"
import { cacheLife, cacheTag } from "next/cache"

import { db, schema } from "@/drizzle"
import { contentColumns } from "@/drizzle/table-columns"

export async function readContent(slug: string) {
  "use cache"
  cacheTag(`contents/${slug}`)
  cacheLife("hours")

  const [row] = await db
    .select(omit(contentColumns, ["searchText"]))
    .from(schema.contents)
    .where(eq(schema.contents.slug, slug))
    .limit(1)

  return row ?? null
}
```

Queries always reference tables as `schema.contents` (no `const { contents } = schema`) and choose columns
with es-toolkit `pick` / `omit` over the sets in `@/drizzle/table-columns`. See
[database.md](database.md#queries).

- Tag format: `<entity>/<id>` plus a collection tag for lists: `contents/${slug}`, `contents/list`,
  `episodes/${id}`, `tracks/${id}`, `auth-account/${accountId}`. Every mutation must invalidate the tags it
  affects.
- Cached functions must be **deterministic given their arguments**. No `new Date()` comparisons, no
  `Math.random()`, no `cookies()` inside them. Read runtime values outside and pass them in.
- Keep cache keys low-cardinality. Cache `readEpisodes(seasonId)`, not `readEpisodes(seasonId, search)` —
  filter in memory.
- Per-user data (watch progress, my list) is usually **not** worth `use cache: remote` (one entry per user,
  near-zero hit rate on localhost). Query it directly in the page.
- Built-in `cacheLife` profiles: `"seconds"`, `"minutes"`, `"hours"`, `"days"`, `"weeks"`, `"max"`,
  `"default"`. Add custom ones in `next.config.ts` → `cacheLife` if you need them.

## Rendering: plain SSR

The app runs on one machine for a home LAN, so we choose simple code over streaming. Pages render **fully on
the server, then send the complete HTML**:

- **No `<Suspense>`, no `fallback`, no skeletons, no `loading.tsx`.** Pages and layouts `await` their data
  directly.
- **Keep `export const instant = false` in `app/layout.tsx`.** It opts the whole app out of Cache Components'
  static-shell validation, which is what allows runtime reads (`cookies()`, `searchParams`, DB queries)
  outside a Suspense boundary. Don't add `instant = true` to any segment.
- **A page that reads the session also needs its own `export const instant = false`** (see `watch/page.tsx`).
  The root layout's `false` only covers the static-shell check; instant-navigation validation runs per page
  and flags the blocking session read in dev. `resolveSession` calls `connection()` first, so a Partial
  Prefetching prerender stops there instead of reading the clock.
- A layout may `await` the session (e.g. the `(protected)` layout checks auth before rendering children).
- Navigation feedback comes from the top loader bar (`@/components/link` + `loader.tsx`), not from skeletons.
- Speed comes from fast queries, `Promise.all`, and `"use cache"` on catalogue reads (see
  [performance.md](performance.md)), not from streaming.

## Page pattern

A page is a thin async Server Component. It parses its inputs, loads everything it needs in parallel, and
passes plain data to components in `components/`.

```tsx
import type { Metadata } from "next"
import { z } from "zod"

import { readContentEpisodes, readWatchEpisode } from "./actions/read"
import { Player } from "./components/player"
import { WatchNotice } from "./components/watch-notice"
import { queryValidator } from "./validator.nuqs"

export const metadata: Metadata = { title: "Watch" }

export default async function Watch({ searchParams }: NextSearchParams) {
  const { vid, t } = queryValidator.parse(await searchParams)
  if (!vid || !z.uuid().safeParse(vid).success) return <WatchNotice kind='invalid-link' />

  const episode = await readWatchEpisode(vid) // ?vid= is episodes.id
  if (!episode) return <WatchNotice kind='not-found' />

  const episodes = await readContentEpisodes(episode.contentId)

  // The watch page is only the player: episodes go to its Playlist panel as props
  return <Player episode={episode} episodes={episodes} startAt={t} />
}
```

- Parse `searchParams` / `params` once at the top of the page with the route's `validator.nuqs.ts` / Zod.
  Never pass raw strings to queries.
- Start independent queries together: `const [content, seasons] = await Promise.all([...])`. Only await in
  sequence when one query needs the other's result (as with `episode.contentId` above).
- Call `notFound()` for missing or invalid IDs instead of rendering an empty page. **Exception: the watch
  page** renders an inline message box (`watch-notice.tsx`, not a modal) for an invalid link and for a track
  that doesn't exist, as above.
- Components below the page receive data as props. Client Components receive plain serializable objects (no
  `Date` methods relied on, no class instances).

## Server Actions

```ts
"use server"

import { updateTag } from "next/cache"
import { z } from "zod"

import { withAuth } from "@/actions/auth"
import { db, schema } from "@/drizzle"

import { progressValidator } from "./validator.zod"

export const updateProgress = withAuth(async (account, input: unknown) => {
  const parsed = progressValidator.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors }
  }

  await db
    .insert(schema.watchProgress)
    .values({ accountId: account.id, ...parsed.data })
    .onConflictDoUpdate({
      target: [schema.watchProgress.accountId, schema.watchProgress.trackId],
      set: { positionSeconds: parsed.data.positionSeconds }
    })

  updateTag(`watch-history/${account.id}`)
  return { ok: true as const }
})
```

- `"use server"` at the top of the file; every export is a public endpoint — treat it like an API route.
- **Validate every input with Zod**, even if the form already validated it on the client. Treat arguments as
  `unknown`.
- **Authorize inside the action** with `withAuth` — UI checks are not security.
- Return serializable result objects `{ ok, data | errors }` for expected failures; throw / `ErrorBoundary`
  only for unexpected or auth failures.
- Invalidate with `updateTag` (read-your-writes) after the write. Use `redirect()` last — it throws.
- `serverActions.bodySizeLimit` is `4mb`: never send media through a Server Action.
- Server Actions run sequentially per client. For high-frequency calls (watch progress every few seconds) use
  a Route Handler + `navigator.sendBeacon` instead — see [video-streaming.md](video-streaming.md).

## Route Handlers (`app/api/**/route.ts`)

Use them only for non-UI responses: video bytes (Range requests), art, beacons, health checks. UI data goes
through Server Components; mutations from UI go through Server Actions.

```ts
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest, ctx: RouteContext<"/api/stream/[vid]">) {
  const { vid } = await ctx.params
  ...
}
```

The project's Route Handlers are `/api/stream/[vid]` (video bytes), `/api/art/[kind]/[id]` (posters and
thumbnails), and `/api/progress` (beacon). See [video-streaming.md](video-streaming.md).

Route Handlers must authorize themselves (read the cookie, validate the token) — `withAuth` redirects, so use
the token helpers directly and return `401`/`403` responses.

## Special files

- `loading.tsx` — **not used** in this project (plain SSR, see above).
- `error.tsx` — must be `"use client"`; `reset()` retries.
- `not-found.tsx` — call `notFound()` from `next/navigation` when a slug/ID doesn't exist.
- Metadata — export `metadata` or `generateMetadata` from pages; the title template lives in
  `constants/metadata.ts` (`"%s • Luminous • …"`). `robots` is `noindex` (private app).

## Navigation

- Use `@/components/link` (`Link`) for in-app links — it triggers the top loader bar. Use `next/link` directly
  only where the loader is unwanted.
- `next/link` prefetches in production when the link is in the viewport. For long rows of posters, consider
  `prefetch={false}` and prefetch on hover to avoid flooding the server.
- Read `02-guides/optimizing-prefetching.md` before changing prefetch behaviour.
