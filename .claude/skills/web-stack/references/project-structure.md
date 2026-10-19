# Project Structure

Path alias: `@/*` → `./src/*`. Always import across folders with `@/`; use relative imports only inside the
same feature folder (e.g. a page importing its own `./validator.nuqs`).

## Repo root

| Folder    | Purpose                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/`    | The app (below)                                                                                                                    |
| `tests/`  | **Scripts**, not tests. The project has no automated tests; `tests/` plays the role of a `scripts/` folder (keep the name `tests`) |
| `notes/`  | The owner's notes and plans                                                                                                        |
| `public/` | Static files only. Never media                                                                                                     |

`tests/` holds one-off and maintenance scripts run with bun from the repo root: account creation
(`tests/account.spec.ts`), media import, ffmpeg helpers, and quick experiments. Name them `<topic>.spec.ts`; a
script too big for one file keeps its entry there and its parts in `tests/<topic>s/` (`tests/track.spec.ts` +
`tests/tracks/*.ts`). They may import from `@/…`, and must end the DB connection (`db.$client.end()`) so the
process exits. **Don't write unit/integration tests** or add a test runner unless the owner asks.

## Top level of `src/`

```
src/
├── actions/              Shared Server Actions + server-only helpers used by many routes
│   ├── auth/             index.ts (withAuth, withGuard), read.ts, sign-in.ts, sign-out.ts, validator.zod.ts
│   ├── common/           create.ts, read.ts, update.ts, delete.ts
│   ├── <domain>/         e.g. contents/, episodes/, watch-history/ — same CRUD file names
│   ├── client.ts         request info (user agent, IP)
│   ├── error.ts          ErrorBoundary() → redirects to /error-boundary
│   └── token.ts          generateToken / validateToken (cipher)
├── app/
│   ├── (public)/         Routes anyone can open (home, browse, content detail)
│   ├── (protected)/      Routes that require a session (watch, my list, history, settings)
│   ├── (labs)/           Throwaway test UIs: plain HTML, no Tailwind/styling (see below)
│   ├── api/              Route Handlers only for non-UI responses (video bytes, art, beacons)
│   ├── error-boundary/   Error page that ErrorBoundary() redirects to
│   ├── error.tsx, not-found.tsx, layout.tsx
├── components/           Shared UI used by 2+ routes (link.tsx, loader.tsx, svg.tsx, …)
├── constants/            Enums, cookie names, metadata, fonts; env/ holds Zod-validated env
├── drizzle/              db client, schema/*.schema.ts, relations, types, table-columns, seeds, utils
├── hooks/                Shared client hooks, re-exported from hooks/index.ts
├── libs/                 Framework-agnostic helpers: cipher, logger, utils (cls), cache handlers
├── stores/<name>/        zustand store: state.ts (createXStore) + index.tsx (Provider + hook)
├── styles/               globals.css, theme.css (@theme tokens), custom.css (@layer components)
└── types/app.d.ts        Global ambient types (declare type …)
```

## `(labs)` — test UIs

When you need a UI just to try something out (call a Server Action, check an API route, poke the player), put
it under `src/app/(labs)/<name>/page.tsx`, e.g. `(labs)/sign-in/page.tsx` to exercise `signIn` before the real
modal exists.

- **Plain HTML only**: `<form>`, `<input>`, `<button>`, `<pre>`. No Tailwind classes, no styling, no design
  work.
- It doesn't follow the `/browse` folder pattern, and it skips the performance and polish rules. Keep it to
  one file when possible.
- It reuses the real actions and readers. Never put logic in a lab that the real feature will need: put that
  in `@/actions` / `@/libs` and call it from the lab.
- Labs are dev tools, not features. Don't link to them from the app.

## Route folder layout (the `/browse` pattern)

Every page folder follows the same shape. Create only the files you need, but use these names:

```
app/(public)/browse/
├── page.tsx              Server Component (plain SSR). Parses params, loads data with Promise.all, composes
├── layout.tsx            (optional) shared chrome for nested segments
├── actions/              Route-local Server Actions and cached readers
│   ├── read.ts           "use server" or cached query functions for this page
│   ├── create.ts         (when the page mutates)
│   ├── update.ts
│   └── delete.ts
├── components/           Route-local components (kebab-case files, named exports)
├── utils.ts              Route-local pure helpers (formatting, mapping DB rows → view models)
├── validator.nuqs.ts     Search params schema: createSearchParamsCache → queryValidator / QueryValidator
└── validator.zod.ts      Form / action input schema: formValidator / FormValidator
```

Dynamic segments nest the same structure: `app/(public)/contents/[slug]/page.tsx`. A page that shows one item
out of many can take it from search params instead: the watch page is `app/(protected)/watch/page.tsx` with
`?vid=<trackId>`. Scaffold with `bun .claude/skills/web-stack/scripts/new-route.ts <group> <segment>`.

## Local vs shared — where does it go?

| Used by…                        | Action / reader                   | Component                   | Hook / util              |
| ------------------------------- | --------------------------------- | --------------------------- | ------------------------ |
| One route                       | `app/…/<route>/actions/<crud>.ts` | `app/…/<route>/components/` | `app/…/<route>/utils.ts` |
| Two or more routes              | `@/actions/<domain>/<crud>.ts`    | `@/components/`             | `@/hooks/` or `@/libs/`  |
| Not tied to React / Next at all | —                                 | —                           | `@/libs/`                |

Start local. Promote to the shared folder the moment a second route needs it — move it, don't copy it.

Shared actions are grouped by domain and always split into the four CRUD files: `read.ts`, `create.ts`,
`update.ts`, `delete.ts`. Domain-specific verbs that don't fit CRUD (e.g. `sign-in.ts`) get their own
kebab-case file in the domain folder.

## Suggested domains for this app

Use these names so features land in predictable places:

| Domain          | Tables (drizzle/schema)               | Typical routes                     |
| --------------- | ------------------------------------- | ---------------------------------- |
| `auth`          | `accounts`, `profiles`, `preferences` | sign-in, sign-out, settings        |
| `contents`      | `contents`, `seasons`                 | `/`, `/browse`, `/contents/[slug]` |
| `episodes`      | `episodes`, `tracks`                  | `/contents/[slug]`, `/watch?vid=`  |
| `watch-history` | `watch_histories`                     | continue-watching row, `/history`  |
| `watchlist`     | `watchlists`                          | `/my-list`                         |

## File naming

| Kind              | Convention                         | Example                                 |
| ----------------- | ---------------------------------- | --------------------------------------- |
| Files and folders | kebab-case                         | `sign-in.ts`, `error-boundary/`         |
| Hook files        | kebab-case with `use-` prefix      | `use-countdown.ts`, `use-loader.ts`     |
| Validators        | `validator.<lib>.ts`               | `validator.zod.ts`, `validator.nuqs.ts` |
| Drizzle schema    | `<domain>.schema.ts`               | `accounts.schema.ts`                    |
| Seed data         | `drizzle/seeds/data/<table>.ts`    | `seeds/data/genres.ts`                  |
| Route groups      | `(public)`, `(protected)`          |                                         |
| Global types      | `src/types/*.d.ts`, `declare type` | `AuthToken`, `NextSearchParams`         |

**Every file and folder name is kebab-case**: components, hooks, stores, utils, and scripts alike
(`playlist-panel.tsx`, `use-media-source.ts`, `track.spec.ts`). The only exceptions are names the framework
fixes (`page.tsx`, `layout.tsx`, `route.ts`, `next.config.ts`, …) and the dotted suffixes in the table above
(`.zod`, `.nuqs`, `.schema`, `.spec`). This is about file names only: exported identifiers stay camelCase /
PascalCase (`useMediaSource`, `PlaylistPanel`).

## Barrels

Only `hooks/index.ts` and `constants/index.ts` are barrels. Don't add `index.ts` re-exports elsewhere — they
blur the server/client boundary and hurt tree-shaking. `actions/auth/index.ts` is the `withAuth` module, not a
barrel.
