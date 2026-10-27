# Libraries

Version-specific usage for everything except Next.js ([nextjs.md](nextjs.md)), Drizzle
([database.md](database.md)), and UI components ([ui-components.md](ui-components.md)).
Install with `bun add <pkg>`; ask before adding a dependency that duplicates one below.

## Zod v4

```ts
import { z } from "zod"

export const formValidator = z.object({
  username: z.string().trim().nonempty().max(50),
  password: z.string().min(8).max(32),
  keepLoggedIn: z.boolean().optional()
})

export type FormValidator = z.infer<typeof formValidator>
```

v4 differences from v3 (don't use the v3 forms):

| v3                               | v4                                                 |
| -------------------------------- | -------------------------------------------------- |
| `z.string().email()` / `.uuid()` | `z.email()`, `z.uuid()`, `z.url()` (top-level)     |
| `error.flatten()` / `.format()`  | `z.flattenError(error)`, `z.treeifyError(error)`   |
| `{ message: "…" }`               | `{ error: "…" }` (message still works, deprecated) |
| `z.nativeEnum(Enum)`             | `z.enum(Enum)`                                     |
| `.passthrough()` / `.strict()`   | `z.looseObject()` / `z.strictObject()`             |

- `safeParse` in Server Actions (return errors); `parse` for env and trusted internal data
  (throw).
- One schema serves both client (react-hook-form resolver) and server (action) — import
  the same validator.
- `drizzle-orm/zod` can derive schemas from tables (`createInsertSchema(schema.episodes)`)
  — use it for admin/seed inputs, then `.pick()`/`.extend()`; write user-facing form
  schemas by hand.

## nuqs v2 — URL state

Server side (pages), one `validator.nuqs.ts` per route:

```ts
import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum
} from "nuqs/server"

export const queryValidator = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  sort: parseAsStringEnum(["popular", "newest", "alphabetical"]).withDefault("popular"),
  genre: parseAsString,
  search: parseAsString
})

export type QueryValidator = Awaited<ReturnType<typeof queryValidator.parse>>
```

Client side, share the parsers so both ends agree:

```ts
"use client"

import { parseAsString, useQueryStates } from "nuqs"

const [filters, setFilters] = useQueryStates(
  { search: parseAsString.withDefault("") },
  { shallow: false, throttleMs: 300 }
)
```

- `shallow: false` when the server must re-render with the new params (filters,
  pagination).
- Debounce/throttle text inputs; never push a URL update on every keystroke.
- `NuqsAdapter` is already mounted in `app/layout.tsx`.
- Use URL state for anything shareable or bookmarkable (filters, sort, page, selected
  season). Use zustand for ephemeral UI state (loader, player UI).

## react-hook-form v7

```tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { signIn } from "@/actions/auth/sign-in"
import { formValidator, type FormValidator } from "@/actions/auth/validator.zod"

export function SignInForm() {
  const form = useForm<FormValidator>({ resolver: zodResolver(formValidator), mode: "onSubmit" })

  const handleSubmit = form.handleSubmit(async (values) => {
    const result = await signIn(values)
    if (!result.ok) {
      ...set server errors with form.setError(...)
      return
    }
    ...close the sign-in modal (the route re-renders with the new cookie)
  })

  return <form onSubmit={handleSubmit}>…</form>
}
```

- Use `register` for native inputs; `Controller` only for custom components.
- Don't `watch()` the whole form — subscribe to specific fields (`useWatch({ name })`) to
  avoid re-renders.
- Map server-returned field errors back with `form.setError`.

## zustand v5 — client state

Store-per-request through context (never a module-level global store — it would leak
between requests on the server). Follow `src/stores/main/`:

- `state.ts`: `State` and `Actions` types, `createXStore(initialState)` with
  `createStore<XState>()(…)`.
- `index.tsx`: `"use client"`, context, `XStoreProvider` holding the store in `useRef`,
  `useXStore(selector)`.
- Always select the smallest slice: `useStore((state) => state.loader)`. Selecting the
  whole state re-renders on every change. For multiple fields use `useShallow` from
  `zustand/react/shallow`.
- Add new stores (e.g. `stores/player/` for volume, muted) instead of growing `main`.

## Tailwind CSS v4

- CSS-first config — there is no `tailwind.config.js`. Tokens live in
  `src/styles/theme.css` `@theme { … }`.
- v4 syntax: `bg-size-[200%]`, `bg-(--my-var)`, `max-sm:`, `not-*:`, `inset-shadow-*`,
  `@starting-style` via `starting:`. Opacity via slash: `bg-white/20`.
- Use `aspect-video` / `aspect-[2/3]` for thumbnails and posters so layout is reserved
  before images load.
- `globals.css` imports `tw-animate-css` and `shadcn/tailwind.css` (shadcn's keyframes and
  its `data-open:`, `data-checked:`, `data-disabled:` … variants).
- Colour tokens follow the shadcn convention and primary is white; see
  [ui-components.md](ui-components.md#theme).

## Hugeicons

```tsx
import { PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export function PlayButton() {
  return (
    <button type='button' aria-label='Play'>
      <HugeiconsIcon
        icon={PlayIcon}
        size={20}
        strokeWidth={1.5}
        className='text-zinc-300'
      />
    </button>
  )
}
```

- Import individual icons by name (tree-shakeable). Never import the whole icon set.
- Icon-only buttons need `aria-label`.
- For one-off brand marks, use `@/components/svg` (`SVG`) with inline paths.
- The player is the exception: it uses `@keyline-icons/react/fill` (see
  [ui-components.md](ui-components.md#icons)).

## es-toolkit (replaces lodash)

```ts
import { chunk, debounce, groupBy, throttle, uniqBy } from "es-toolkit"
```

- Never add `lodash`. `es-toolkit/compat` exists, but prefer the main entry.
- Prefer native first (`Object.groupBy`, `Array.prototype.toSorted`, `structuredClone`);
  reach for es-toolkit when native is missing or awkward (`debounce`, `throttle`,
  `uniqBy`).

## date-fns v4

- Format durations and dates with date-fns, not hand-rolled math: `intervalToDuration`,
  `formatDuration`, `format(date, "PP")`, `formatDistanceToNowStrict`.
- Timestamps in the DB are `timestamptz`; the app TZ is `ENV.TZ` (`Asia/Singapore`).
- Episode runtime / position are stored as integer **seconds**; format at render time.

## uuid

- Primary keys are generated by Postgres (`uuid().defaultRandom()`). Use `uuid` in app
  code only for derived deterministic keys, e.g. `uuidV5(token, NIL)` to turn a token into
  a short cache tag.

## framer-motion

- It's heavy. Use `LazyMotion` + `m` components with `domAnimation` loaded async, and only
  in Client Components that actually animate.
- Animate UI imports the same library through `motion/react` (`motion` re-exports
  framer-motion) and renders `motion.*` eagerly. That's accepted for its components, but
  never put them under the player's `<LazyMotion strict>`, which throws on `motion.*`.
- Prefer CSS transitions / Tailwind `transition-*` and `@keyframes` in `theme.css` for
  simple hovers and fades.
- Respect `prefers-reduced-motion` (`useReducedMotion()` or `motion-safe:` utilities).

## react-use

- Available for browser hooks (`useIntersection`, `useMedia`, `useLocalStorage`,
  `useIdle`). Check it before writing a custom hook, and put project-specific hooks in
  `@/hooks`.

## redis

- Used by the Next.js remote cache handler (`src/libs/cache-handlers/redis-handler.js`,
  ESM, reads `REDIS_URL`). Don't open other Redis clients casually; if you need Redis
  directly (e.g. rate limiting sign-in), create one shared client in `@/libs/redis.ts`
  using `REDIS` from `@/constants/env`.
