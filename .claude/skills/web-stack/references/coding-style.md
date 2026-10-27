# Coding Style

## Formatting (Prettier does it — don't fight it)

`prettier.config.mjs` is the source of truth. Run `bunx prettier --write <files>` after
editing. Key results:

- No semicolons. Double quotes in TS (`"use server"`), **single quotes in JSX attributes**
  (`className='flex gap-4'`).
- `printWidth: 110`, `trailingComma: "none"`, `bracketSameLine: true`, LF line endings.
- Tailwind classes are auto-sorted, including inside `cls(...)` and `clsx(...)`.
- Imports are auto-grouped, separated by a blank line, in this order:

1. Node built-ins (`crypto`, `node:fs`)
2. Third-party packages (`next/headers`, `zod`)
3. `@/` aliases
4. Relative (`../token`, `./validator.nuqs`)
5. CSS (side-effect imports)

```ts
import crypto from "crypto"

import { cookies } from "next/headers"
import { z } from "zod"

import { APP_TOKEN } from "@/constants"

import { validateToken } from "../token"
import { queryValidator } from "./validator.nuqs"

import "@/styles/globals.css"
```

Sorting is done by `@ianvs/prettier-plugin-sort-imports`; the groups come from
`importOrder` in `prettier.config.mjs`. Two behaviours to know:

- **Side-effect imports (`import "…css"`) are never moved**, and imports aren't sorted
  across them. Write CSS imports last yourself.
- Duplicate imports from the same module are merged into one statement.

Don't switch back to `@trivago/prettier-plugin-sort-imports`: v6 with Prettier 3.9
duplicated every import (4×), including inside Markdown code blocks.

## TypeScript

- `strict` + `verbatimModuleSyntax`: type-only imports **must** use `import type { X }` or
  `import { type X }`.
- No `any`. Use `unknown` and narrow, or infer from the source of truth:
  `z.infer<typeof schema>`, `InferSelectModel<typeof table>`,
  `Awaited<ReturnType<typeof queryValidator.parse>>`.
- Types live next to what produces them: Zod types in `validator.zod.ts`, DB types in
  `drizzle/types.ts`, app-wide ambient types in `src/types/app.d.ts` (`declare type`).
- Props are typed inline and wrapped in `Readonly<{ … }>`:

```tsx
export function Link({
  href,
  children,
  className
}: Readonly<{
  href: string
  children?: React.ReactNode
  className?: string
}>) {
```

- Page/layout props use the global helpers: `NextSearchParams`,
  `NextParams<{ slug: string }>`.
- `type` over `interface`. String enums (`export enum Theme { DARK = "dark" }`) for fixed
  sets in `constants/enum.ts`.
- Numeric separators for readability: `5_000`, `3_600_000`.

## Naming

| Thing                     | Convention                          | Example                                    |
| ------------------------- | ----------------------------------- | ------------------------------------------ |
| Components                | PascalCase function                 | `Link`, `SVG`, `LoaderObserver`            |
| Page / layout components  | PascalCase, named after the route   | `Browse`, `Watch`, `PublicLayout`          |
| Hooks                     | `useX`                              | `useLoader`, `useCountdownTimer`           |
| Server Actions            | verb + noun, camelCase              | `signIn`, `readEpisodes`, `updateProgress` |
| Zod schemas / their types | `xValidator` / `XValidator`         | `formValidator` / `FormValidator`          |
| nuqs caches / their types | `queryValidator` / `QueryValidator` | `searchValidator` / `SearchValidator`      |
| Constants                 | SCREAMING_SNAKE_CASE                | `APP_TOKEN`, `DATABASE_URL`                |
| Booleans                  | `is` / `has` / `should` prefix      | `isActive`, `isSuspended`                  |
| Event handlers            | `handleX`                           | `handleClick`                              |
| Cache tags                | `<entity>/<id>`, kebab-case entity  | `auth-account/${id}`, `contents/${slug}`   |
| DB columns                | camelCase in TS, snake_case in SQL  | `isActive: boolean("is_active")`           |

## Exports

- Named exports for everything shared (`export function Link`).
- `export default` only where Next.js requires it (`page`, `layout`, `error`, `not-found`,
  `loading`, route config) and for modules loaded with `next/dynamic` (e.g.
  `components/loader.tsx`).

## Comments

Never write one-line comments. Use the multi-line block form, even for a single sentence:

```ts
/**
 * Resolves the active account from the auth cookie.
 */
```

Or:

```ts
// Resolves the active account from the auth cookie.
```

Not:

```ts
/** Resolves the active account from the auth cookie. */
```

- Comment the **why** (constraints, trade-offs, non-obvious behaviour), not the what.
- Public helpers in `libs/` and `actions/` get JSDoc with `@param`, `@returns`, and an
  `@example` when usage isn't obvious (see `libs/cipher.ts`, `libs/logger.ts`).
- No commented-out code and no `TODO` in finished work.

## Component and hook body order

Order inside a component or hook, unless there's a reason to deviate:

1. **State** — props destructuring, store selectors, `useState`, `useRef`, derived values
   (`useMemo`), other hooks (`usePathname`, `useLoader`).
2. **Functions** — handlers and callbacks (`useCallback`), then effects (`useEffect`).
3. **Render / return** — early returns first (`if (!visible) return null`), then JSX.

```tsx
export function EpisodeCard({ episode }: Readonly<{ episode: EpisodeCardData }>) {
  const loader = useLoader()
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])

  return (
    <NextLink
      href={`/watch/${episode.id}`}
      onClick={loader.on}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      …
    </NextLink>
  )
}
```

## React rules

- Server Components by default. Add `"use client"` only to the leaf that needs state,
  effects, or browser APIs — never to a page or layout.
- **No React Compiler.** Memoize manually: `useCallback` for handlers passed to children
  or used in effects, `useMemo` for derived objects/arrays and for objects returned from
  hooks (see `useLoader`).
- Dependency arrays must be complete. A missing dependency is a stale-closure bug, not a
  style choice.
- Clean up every effect: listeners, intervals, timeouts, observers, `AbortController`.
- Don't use `useEffect` to derive state from props — compute it during render or with
  `useMemo`.
- Keys are stable IDs from the DB, never array indexes for dynamic lists.
- Context is rendered as `<StoreContext value={…}>` (React 19), not
  `<StoreContext.Provider>`.

## Styling

- Tailwind utilities in JSX; merge conditional classes with `cls()` from `@/libs/utils`
  (clsx + tailwind-merge). The `cn` exported beside it is only the name shadcn's generated
  components import.
- Design tokens go in `src/styles/theme.css`: colours in the shadcn-style `:root, .dark`
  block mapped by `@theme inline`, everything else (spacing, animations, keyframes) under
  `@theme`. Use them as utilities (`bg-background`, `bg-primary`, `animate-loader`,
  `max-w-8xl`).
- Reusable multi-utility patterns go in `src/styles/custom.css` under `@layer components`
  (e.g. `.use-mirror`).
- The app is dark-only (`colorScheme: "dark"`). Use `bg-background` / `text-foreground`,
  zinc for muted text. Primary is white: `bg-primary text-primary-foreground` for
  emphasis. There is no brand hue.
- Use `svh`/`dvh` units for full-height layouts (`min-h-svh`) so mobile browser chrome
  doesn't cause jumps.

## Errors

- Server-side auth / access failures call `ErrorBoundary("<status> <message>")` from
  `@/actions/error`, which logs and redirects to `/error-boundary`. Messages start with
  the HTTP status: `"401 Unauthorized"`,
  `"423 Your account has been temporarily suspended"`.
- Expected validation failures in Server Actions are **returned**, not thrown:
  `return { ok: false, errors: z.flattenError(error).fieldErrors }`.
- Unexpected errors bubble to `app/error.tsx`.
- Logging on the server uses `logger()` from `@/libs/logger`, never bare `console.log`.

## Environment variables

Read env only through `@/constants/env` (`ENV`, `DB`, `CIPHER`, `REDIS`, `DATABASE_URL`),
which are parsed by Zod in `constants/env/validator.zod.ts`. When adding a variable: add
it to `.env.example`, add it to the Zod schema with a sensible default, export it from
`constants/env/index.ts`. Never import `@/constants/env` from a Client Component — only
`NEXT_PUBLIC_*` values are allowed on the client.
