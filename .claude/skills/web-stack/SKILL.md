---
name: web-stack
description:
  Project rules for Luminous, a private home-LAN anime video streaming web app
  (Crunchyroll-like). Load before writing, editing, reviewing, or formatting any
  .ts/.tsx/.css file, before running install or database commands, and before designing a
  feature — even when the request names no library (e.g. "add an episode list", "make the
  player remember progress", "add a login form"). Covers the stack (Next.js 16 with Cache
  Components, React 19, shadcn/ui on Base UI + Animate UI, Tailwind v4, Drizzle ORM +
  Postgres, Redis, Zod v4, nuqs, zustand), folder layout, UI components, coding style,
  cipher-based auth, video streaming, and web performance.
---

# Web Stack — Project Luminous

Luminous is a private **home-LAN** video streaming app (dev on localhost, prod over HTTPS
on the LAN) (think Crunchyroll, not a clone): browse a catalogue of contents (anime,
movies, series), open one, pick an episode, watch it, and resume where you left off. There
is no CDN, no cloud storage, and no multi-region concern — but the app should still be
built as if it were real software.

Do not fall back on generic or older-version knowledge (Next.js 13–15 patterns,
`middleware.ts`, Zod v3, lodash, Drizzle `relations()` v0, JWT libraries, Radix-style
`asChild`, HeroUI / NextUI, which were removed). Every library here has breaking changes
from what most training data shows. When unsure about a Next.js API, read
`node_modules/next/dist/docs/01-app/` first.

## Mindset: Software Engineer, not Vibe Coder

`SE_VB.jpg` contrasts "Looks good. It works. Ship it!" (copy-paste, quick fixes, `TEMP`,
"add later", "IDK but it works") with "Plan. Design. Structure. Scale." Work like the
engineer:

- **Plan before typing.** Read the surrounding code and find the existing helper, hook,
  component, or validator before creating a new one. Reuse > duplicate.
- **Put code where it belongs.** Follow
  [project structure](references/project-structure.md) — no dumping logic into a page file
  because it was convenient.
- **No placeholder hacks.** No `any`, `// TODO`, `// TEMP`, commented-out code, or
  `console.log` left behind unless the user asked for a stub. If something is genuinely
  unfinished, say so in your reply.
- **Understand every fix.** If you can't explain why a change works, it isn't done.
- **Think about performance up front** ([performance](references/performance.md)), not as
  an afterthought.
- **Verify.** Run Prettier on what you touched and, for non-trivial changes,
  `bun run build` (it type-checks and catches Cache Components errors).

## Stack

| Layer        | Tool                                                                   | Notes                                                          |
| ------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| Runtime / PM | bun                                                                    | `bun add`, `bun run`, `bunx` — never npm/yarn/pnpm             |
| Framework    | Next.js 16.4                                                           | App Router, `cacheComponents: true`, `proxy.ts`                |
| UI runtime   | React 19.3                                                             | **No React Compiler** — memoize manually                       |
| Styling      | Tailwind CSS v4                                                        | CSS-first `@theme` in `src/styles/theme.css`, `cls()` merge    |
| UI library   | shadcn/ui on Base UI + Animate UI (`components/ui/`)                   | Base UI, **not Radix** — see [ui](references/ui-components.md) |
| Icons        | Hugeicons; Keyline (fill) in the player                                | `@hugeicons/react` + `@hugeicons/core-free-icons`              |
| Database     | Drizzle ORM 1.0 (rc) + `postgres` (js)                                 | Relational Queries v2 (`defineRelations`), `drizzle-kit`       |
| Cache        | Redis                                                                  | Backs `"use cache: remote"` via `src/libs/cache-handlers/`     |
| Auth         | AES-GCM cipher token (`src/libs/cipher.ts`)                            | **Not JWT** — see [auth](references/auth-cipher.md)            |
| Validation   | Zod v4                                                                 | env, Server Action input, forms                                |
| URL state    | nuqs v2                                                                | `createSearchParamsCache` on the server                        |
| Forms        | react-hook-form v7 + `@hookform/resolvers`                             | Zod resolver, shares the action's validator                    |
| Client state | zustand v5                                                             | Store-per-request via React context                            |
| Utilities    | es-toolkit, date-fns v4, uuid                                          | es-toolkit replaces lodash                                     |
| Animation    | motion (framer-motion)                                                 | Lazy in the player; Animate UI loads it eagerly                |
| Formatting   | Prettier 3.9 + `@ianvs/prettier-plugin-sort-imports` + tailwind plugin | `prettier.config.mjs` is the source of truth                   |

## Reference files — read the one that matches the task

| Task                                                              | Read                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| Creating a route, action, component, hook, store, or any new file | [project-structure.md](references/project-structure.md) |
| Writing or reviewing any code (naming, comments, ordering, types) | [coding-style.md](references/coding-style.md)           |
| Pages, layouts, caching, Server Actions, Route Handlers, `proxy`  | [nextjs.md](references/nextjs.md)                       |
| Buttons, modals, forms, selects — any UI component, theme tokens  | [ui-components.md](references/ui-components.md)         |
| Zod, nuqs, react-hook-form, zustand, Tailwind, icons, utilities   | [libraries.md](references/libraries.md)                 |
| Tables, queries, migrations, seeds                                | [database.md](references/database.md)                   |
| Sign-in, sign-out, sessions, tokens, protected routes, passwords  | [auth-cipher.md](references/auth-cipher.md)             |
| Video player, media files, watch progress                         | [video-streaming.md](references/video-streaming.md)     |
| Running prod, LAN access, HTTPS certificates, other devices       | [lan-https.md](references/lan-https.md)                 |
| Anything user-facing, data-heavy, or on a hot path                | [performance.md](references/performance.md)             |

## Tools

- `bun .claude/skills/web-stack/scripts/new-route.ts <route-group> <segment>` — scaffolds
  a route folder with the `/browse` layout (page, `actions/read.ts`, `components/`,
  `utils.ts`, validators). Example:
  `bun .claude/skills/web-stack/scripts/new-route.ts public contents/[slug]`.
- `bunx --bun shadcn@latest add <name>` → fix its `cn` import →
  `bunx --bun @animate-ui/cli@latest animate <name>` — add a UI component. The exact steps
  are in [ui-components.md](references/ui-components.md).
- Ad-hoc scripting in Bash (bulk edits, quick data checks): if Python is easier for you,
  use it (`python -I`) instead of `bun -e`.
- `bunx prettier --write <files>` — format what you touched.
- `bunx next typegen && bunx tsc --noEmit -p .` — quick type-check (typegen creates
  `RouteContext` etc.).
- `bun run build` — full type-check + Cache Components validation.
- `bun run start:prod` — HTTPS server for the LAN (`next-prod.ts`);
  `bun tests/certificate.spec.ts` issues its certificate. See
  [lan-https.md](references/lan-https.md).
- `bun run drizzle:generate` / `bun run drizzle:migrate` — see
  [database.md](references/database.md).
- `bun tests/account.spec.ts --email … --password … [--role admin] [--username …]` —
  create an account.
- `bun tests/track.spec.ts --season <id> [--remux] [--force]` — import a season from disk
  in one run: remux to fragmented MP4 if asked, write its episodes and tracks, then
  generate thumbnails and sprite sheets (`--force` regenerates existing art). See
  [video-streaming.md](references/video-streaming.md#import-step-teststrackspects).

## Project notes

- **No automated tests.** Don't write unit/integration tests or add a test runner. The
  `tests/` folder is the **scripts** folder (it keeps that name): one-off bun scripts like
  `tests/account.spec.ts`. See
  [project-structure.md](references/project-structure.md#repo-root).
- **Test UIs go in `src/app/(labs)/`**: plain HTML, no Tailwind or styling. Use them to
  exercise actions and routes before the real UI exists. See
  [project-structure.md](references/project-structure.md#labs--test-uis).
- **Sign-in is a modal**, not a `/sign-in` page. **There is no sign-up**: accounts are
  created with `tests/account.spec.ts`. Users sign in with a username or an email. See
  [auth-cipher.md](references/auth-cipher.md).
- **Test accounts.** To test auth or anything else that needs a signed-in user, use these
  accounts. Don't create new ones.

  | Role  | Email               | Password   |
  | ----- | ------------------- | ---------- |
  | admin | `admin@luminous.co` | `p4ssw02d` |
  | user  | `user@luminous.co`  | `p4ssw02d` |

## Definition of done

1. Code lives in the right folder with the right file name.
2. Inputs are validated with Zod (actions) or nuqs (search params); env only via
   `@/constants/env`.
3. Protected data is checked on the server, close to the data (`withAuth`), never only in
   the UI.
4. Pages use plain SSR (no Suspense or skeletons) with independent queries in
   `Promise.all`. Shared data is cached with `"use cache"` + `cacheTag` + `cacheLife`, and
   every mutation invalidates the tags it affects.
5. No `any`, no leftovers, comments follow the block style.
6. Prettier run; `bun run build` passes for non-trivial changes. If you could not run it,
   say so.
