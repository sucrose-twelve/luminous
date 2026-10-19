# Project instructions

## This is NOT the Next.js you know

This project runs Next.js 16 — APIs, conventions, and file structure may differ from your training data.
Before writing Next.js code, read the relevant guide in the version-matched docs bundled at
`node_modules/next/dist/docs/` (`01-app/` for the App Router). Heed deprecation notices.

## Stack & conventions

Load the project `web-stack` skill (`.claude/skills/web-stack/SKILL.md`) before writing, editing, reviewing,
or formatting any code, or running install or database commands. It covers the stack, folder layout, coding
style, Drizzle + Postgres, cipher auth, video streaming, and web performance, with one reference file per
topic under `references/`.

## Project

Luminous is a private, home-LAN video streaming app (Like: Crunchyroll, BiliBili): `start:dev` is localhost-only,
`start:prod` serves HTTPS to the LAN. Media lives on local drives; the DB stores each file's full absolute
path (e.g. `<CONTENTS_SOURCE_DIR>/<name>/...`), and files are served by ID through Route Handlers.

## Notes

- `agentRules: false` is set in `next.config.ts` so `next dev` no longer generates `AGENTS.md` / `CLAUDE.md`
  at the project root. Keep agent instructions in this file instead.
