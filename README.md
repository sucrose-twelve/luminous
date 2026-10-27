# Luminous

A private video streaming app for the home LAN, in the spirit of Crunchyroll or BiliBili:
browse a catalogue of anime, series, and movies, open a season, pick an episode, watch it,
and pick up where you left off.

Media stays on the server's local drives. There is no CDN, no cloud storage, and no media
in this repository. The database stores each file's full absolute path (for example
`<CONTENTS_SOURCE_DIR>/Frieren/1/01.mp4`); the browser only ever sees IDs, and files are
served by ID through Route Handlers.

> **Personal project.** Luminous is built to run on a single Windows machine and serve the
> other devices in the house over HTTPS. It is not designed to be exposed to the internet.

Throughout this README, `<CONTENTS_SOURCE_DIR>` stands for the folder that holds your
media library.

## Features

- **Browse**: substring and typo-tolerant search (PostgreSQL `pg_trgm`) across Thai,
  Japanese, and English titles, with kind and genre filters, sorting, and pagination.
- **Season page** (`/content/[seasonId]`): every part of a franchise in one place
  (seasons, movies, specials, and spinoffs), with the episode list and a button to resume
  where you left off.
- **Lumine Media Player (LMP)**: a custom player built on Media Source Extensions.
  - Streams fragmented MP4 over HTTP Range requests and seeks with a fragment index
    computed at import time.
  - Switches between the original audio and dubs while watching.
  - Previews thumbnails when hovering the progress bar (sprite sheets).
  - Skips intros and outros (manually or automatically), autoplays the next episode after
    a countdown, and has a playlist panel.
  - Keyboard shortcuts (`Shift` + `/` lists them all) and double-tap to seek ±10 seconds
    on touch screens.
  - Picture-in-Picture, fullscreen, and Media Session (control playback from the OS media
    keys).
  - Remembers where you stopped and resumes from there.
- **Auth**: an AES-GCM encrypted token in an `httpOnly` cookie (not a JWT). There is no
  sign-up; accounts are created from the terminal.
- **HTTPS on the LAN**: mkcert certificates, so phones, laptops, and tablets in the house
  connect without certificate warnings.

## Tech stack

| Layer                     | Tools                                                               |
| ------------------------- | ------------------------------------------------------------------- |
| Runtime / package manager | Bun 1.4 (plus Node.js 24 for the production server)                 |
| Framework                 | Next.js 16 (App Router, Cache Components), React 19                 |
| UI                        | shadcn/ui (Base UI), Animate UI, Tailwind CSS v4, Hugeicons, Motion |
| Database                  | PostgreSQL + Drizzle ORM 1.0 (rc)                                   |
| Cache                     | Redis (the cache handler behind `"use cache: remote"`)              |
| Validation / state        | Zod v4, nuqs, react-hook-form, zustand                              |
| Media tools               | FFmpeg / ffprobe, Video2X (optional)                                |

## Requirements

- [Bun](https://bun.sh) 1.4.x and [Node.js](https://nodejs.org) 24.x
- PostgreSQL with a UTF-8 locale and the `pg_trgm` extension available
- Redis
- FFmpeg and ffprobe on `PATH` (used when importing videos)
- [mkcert](https://github.com/FiloSottile/mkcert) (used to serve production on the LAN)

## Getting started

### 1. Install and configure

```bash
bun install
cp .env.example .env
```

Edit `.env` to match your machine:

| Group    | Variables                                                   | Notes                                                                                    |
| -------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| App      | `NEXT_PUBLIC_APP_URL`                                       | Must always be `https://…` (cookies are `Secure`). The production port is taken from it. |
| Cipher   | `CIPHER_SECRET`                                             | At least 32 characters. The app refuses to start without it.                             |
| Database | `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD`       |                                                                                          |
| Redis    | `REDIS_HOST` `REDIS_PORT` `REDIS_USERNAME` `REDIS_PASSWORD` |                                                                                          |

Generate a `CIPHER_SECRET` with:

```bash
bun -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 2. Set up the database

Enable `pg_trgm` first, since the search indexes depend on it, then run the migrations:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

```bash
bun run drizzle:migrate
```

### 3. Create an account

There is no sign-up page. Create accounts from the terminal:

```bash
bun tests/account.spec.ts --email you@example.com --password <8–32 characters>
bun tests/account.spec.ts --email admin@example.com --password <password> --role admin --username admin
```

Or run `bun run drizzle:seed` once to create the sample accounts in
`src/drizzle/seeds/data/accounts.ts`.

### 4. Start the dev server

```bash
bun run start:dev
```

Open <https://localhost:8443>. The dev server listens on `localhost` only, on purpose:
never expose it to the LAN.

## Importing content

Files stay where they are on disk and are never copied into the project. An example
layout:

```
<CONTENTS_SOURCE_DIR>/Frieren/
├── 1/                       season 1, original audio
│   ├── 01.mp4
│   └── 14 - SP1.mp4         a special episode
├── Thai Dub/1/              season 1, Thai dub
│   └── 01.mp4
└── Thumbnails/1/            generated by the import script
    ├── 01.webp
    └── 01-sprite-sheet.webp
```

1. Create the content and its seasons on the labs pages `/import-content` and
   `/import-season` (available only when `NEXT_PUBLIC_APP_MODE=development`). Each
   season's `sources` lists which folder holds each audio language.
2. Import the season's files:

   ```bash
   bun tests/track.spec.ts --season <seasonId> --remux
   ```

   The script remuxes the files to fragmented MP4 (with `--remux`), writes the episodes
   and tracks to the database, then generates the thumbnails and sprite sheets. It is safe
   to re-run. File naming rules, supported codecs, and every option are documented in
   [tests/tracks/README.md](tests/tracks/README.md) (in Thai).

> MSE only plays fragmented MP4. H.264 8-bit video with AAC audio plays in every browser,
> HEVC only in some, and H.264 10-bit has to be re-encoded by hand.

## Running on the LAN (production)

```bash
bun tests/certificate.spec.ts   # issue a mkcert certificate for localhost and this machine's LAN IPs
bun run build
bun run start:prod              # HTTPS on every interface; prints the URLs it can be reached at
```

- Give the server a fixed IP (a DHCP reservation in the router). When the IP changes, the
  certificate has to be issued again.
- Allow the port through Windows Firewall on the Private profile only (admin PowerShell):

  ```powershell
  New-NetFirewallRule -DisplayName "Luminous (HTTPS 8443)" -Direction Inbound -Protocol TCP -LocalPort 8443 -Action Allow -Profile Private
  ```

- Every other device must trust mkcert's root CA once. Copy only `rootCA.pem` (find it
  with `mkcert -CAROOT`). **Never copy `rootCA-key.pem`.** The steps for each kind of
  device are in [lan-https.md](.claude/skills/web-stack/references/lan-https.md).
- Keep PostgreSQL and Redis bound to `127.0.0.1`. Only the Next.js server should be
  reachable from the LAN.

## Scripts

| Command                         | What it does                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `bun run start:dev`             | Dev server at `https://localhost:8443`                                                           |
| `bun run build`                 | Production build (also type-checks and validates Cache Components)                               |
| `bun run start:prod`            | Production HTTPS server for the LAN (`next-prod.ts`)                                             |
| `bun run drizzle:generate`      | Generate a migration after a schema change                                                       |
| `bun run drizzle:migrate`       | Apply pending migrations                                                                         |
| `bun run drizzle:studio`        | Open Drizzle Studio on port 3443                                                                 |
| `bun run drizzle:seed`          | Create the sample accounts                                                                       |
| `bun tests/account.spec.ts`     | Create an account                                                                                |
| `bun tests/track.spec.ts`       | Import the videos of one season                                                                  |
| `bun tests/certificate.spec.ts` | Issue the HTTPS certificate for the LAN                                                          |
| `bun tests/upscale.spec.ts`     | AI upscaling and frame interpolation with Video2X ([details](tests/upscales/README.md), in Thai) |

The `tests/` folder holds scripts, not automated tests.

## Project structure

```
src/
├── app/
│   ├── (public)/       home, /browse, /content/[seasonId]
│   ├── (protected)/    /watch and the Lumine Media Player
│   ├── (labs)/         test and import pages (development only)
│   └── api/            stream, art, and progress Route Handlers
├── actions/            shared Server Actions (auth, contents, …)
├── components/         components shared by several routes
├── drizzle/            schema, relations, migrations, and seeds
├── libs/               cipher, password, media, and other utilities
├── stores/             zustand stores
└── styles/             Tailwind theme and global CSS
tests/                  Bun scripts (import, accounts, certificate, upscaling)
notes/                  plans and design notes
```

Coding conventions, the folder layout, and how each part of the app works are documented
in [.claude/skills/web-stack/](.claude/skills/web-stack/SKILL.md).

## License

The source code is released under the [MIT License](LICENSE).

The license covers the code only. It does not cover any video, image, or other content
played through the app, which belongs to its respective owners and is not part of this
repository. Only use the app with media you have the right to use.
