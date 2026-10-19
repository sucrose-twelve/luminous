# Lumine Media Player (LMP) — แผนงาน

> เขียนเมื่อ 2026-10-12 · แก้ไขรอบ 3 (ปรับตามดีไซน์) · สถานะ: เฟส 1–11 และ §16.6 เสร็จแล้ว (§16.5, §6.12.1,
> §8.6, §6.2.5, §15.1) เหลือทดสอบบนอุปกรณ์จริง (§15.1)
>
> ดีไซน์อ้างอิง: `docs/design/` — `00-Overview.png` (controls ทั้งหมด), `01-Actions.png` (popover Audio Tracks
> / Preferences + hover preview), `02-Playlist.png` (Playlist panel) ภาพใน `docs/design/references/`
> เป็นแค่แรงบันดาลใจ

## 0. Context

Luminous มีฝั่ง backend สำหรับสตรีมพร้อมแล้ว คือ `GET /api/stream/[vid]` (Range → 206),
`GET /api/stream/[vid]/manifest`, `readTrack()` แบบ cached และตาราง `tracks.fragments` (index ของ fMP4
ที่คำนวณไว้ตอน import) แต่หน้า `src/app/(protected)/watch/page.tsx` ยังเป็น `<div>` ว่าง ยังไม่มีตัว player

LMP คือ video player ของ Luminous ที่สร้างเองบน `<video>` + **Media Source Extensions (MSE)** ไม่ใช้ native
controls ไม่ใช้ library player ภายนอก หน้า `/watch` **มีแค่ LMP** เต็ม viewport รายการตอนอยู่ใน Playlist panel
ของ player (§6.12) ไม่มี header, search หรือ input อื่น ๆ

**เป้าหมาย**: ได้ player ที่มี controls และปุ่มลัดครบตาม spec ด้านล่าง รองรับการจำตำแหน่งที่ดูค้างไว้,
เสียงพากษ์, Autoplay Next, Auto Skip, ภาพตัวอย่างตอน hover progress bar และ PiP ที่ค้างอยู่ได้ข้ามตอน
ใช้ได้ทั้ง desktop (Chrome / Edge / Firefox / Safari) และมือถือบน LAN

### 0.1 Spec จากเจ้าของโปรเจกต์ (ยึดตามนี้)

**Controls**

- Progress bar คลิกเพื่อกระโดดไปเวลานั้นได้
- Time display (`00:00 / 21:00`)
- Play / Pause / Stop / Volume / Mute
- Backward / Forward 10 วินาที
- Prev / Next track (ตอนก่อนหน้า / ตอนถัดไป)
- ตัวเลือกเสียงพากษ์
- ตัวเลือก Autoplay Next, Auto Skip
- **ไม่มี** ตัวเลือก Quality

**Shortcuts** (ทำงานได้แค่แท็บนั้น active อยู่ ไม่ต้อง focus element ใด)

| ปุ่ม        | การทำงาน                     |
| ----------- | ---------------------------- |
| `Space`     | Play / Pause                 |
| `Shift + S` | Stop                         |
| `Shift + M` | Mute / Unmute                |
| `↑` / `↓`   | Volume +5% / −5%             |
| `←` / `→`   | ถอยหลัง / เดินหน้า 10 วินาที |
| `Shift + P` | ตอนก่อนหน้า (Prev track)     |
| `Shift + N` | ตอนถัดไป (Next track)        |
| `Shift + F` | Fullscreen (toggle)          |
| `Shift + I` | Picture-in-Picture (toggle)  |

### 0.2 ข้อตกลง

| เรื่อง                       | ข้อสรุป                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| ชื่อไฟล์                     | **kebab-case ทั้งหมด** รวมไฟล์ hook (`use-media-source.ts`) แก้ใน skill แล้ว                                              |
| Stop ทำอะไร                  | Pause + seek กลับ `0:00` + หยุดโหลด buffer + แสดง poster ทับ **แต่ไม่เขียนทับ progress ที่บันทึกไว้**                     |
| ปุ่มลัดตอน focus ใน input    | ไม่ต้องคิด: หน้า watch ไม่มี input มีแค่ player                                                                           |
| เลือกเสียงพากษ์แล้วจำไหม     | จำ: อัปเดต `preferences.audio_language` ของ account (มีผลทุก content)                                                     |
| ปุ่มลัดชุดเดิมใน skill       | ใช้ชุดใหม่ของ LMP อย่างเดียว                                                                                              |
| `?vid=`                      | **`episodes.id`** (ไม่ใช่ `tracks.id`) + `?audio=<Locales>` ไม่บังคับ — URL ของตอนคงที่ทุกภาษา (§3.2)                     |
| ตอนถัดไปไม่มีภาษาที่ฟังอยู่  | **Next / Shift+N / Media Session ถือว่าไม่มีตอนถัดไป** และการ์ดจบตอนหยุดถาม "Watch in Original" แทน autoplay (§3.5, §8.3) |
| `vid` ผิดรูปแบบ / ไม่พบ      | **ไม่ใช้ `notFound()`** render กล่องข้อความแจ้งเตือนในหน้า (ไม่ใช่ modal) ผ่าน component `watch-notice.tsx` 2 แบบ (§3.3)  |
| ดับเบิลคลิก = fullscreen     | **ไม่ทำ**                                                                                                                 |
| PiP ข้ามตอน                  | **ใช้ `<video>` ตัวเดิมตลอด** เปลี่ยนแค่ MediaSource → PiP/fullscreen ค้างอยู่ข้ามตอนได้ (§8.5)                           |
| หน้าต่างรายการปุ่มลัด        | **ทำ** (`Shift + /`) (§7.8)                                                                                               |
| Hover preview thumbnail      | **ทำ** ด้วย sprite sheet (§6.2.4, §16)                                                                                    |
| ดับเบิลแตะ ±10 วิ (มือถือ)   | **ทำ** (§10.3)                                                                                                            |
| ความเร็วการเล่น              | ไม่ทำ                                                                                                                     |
| แสดงเวลาที่เหลือ             | ไม่ทำ                                                                                                                     |
| Theater mode                 | ไม่ทำเป็นโหมดแยก เพราะ player เต็ม viewport อยู่แล้ว                                                                      |
| ดีไซน์อ้างอิง                | `docs/design/` (00-Overview, 01-Actions, 02-Playlist) ดีไซน์ชนะ spec ข้อความเมื่อขัดกัน                                   |
| รายการตอน                    | **Playlist panel ใน player อย่างเดียว** (§6.12) ไม่มีรายการตอนใต้ player                                                  |
| Stop                         | **Shortcut อย่างเดียว** (`Shift+S` + Media Session `stop`) ไม่มีปุ่มบน UI ตามดีไซน์                                       |
| Volume                       | ดีไซน์มีแค่ปุ่มลำโพง → **slider กางออกตอน hover/focus** (§6.6)                                                            |
| Time display                 | **ตามดีไซน์**: เวลาที่เล่นซ้าย / ความยาวขวา เหนือ progress bar, `mm:ss` หรือ `h:mm:ss` เมื่อ ≥ 1 ชม. (§6.3)               |
| ภาษาของข้อความ UI            | **ภาษาอังกฤษตามดีไซน์** (ปุ่ม, aria-label, OSD, popover, notice, การ์ดตอนถัดไป) ชื่อเสียงพากษ์เป็นภาษาของตัวเอง (§6.9)    |
| ที่เก็บ thumbnail / sprite   | `seasonArtDirectory(sources)/{NN}.webp` และ `{NN}-sprite-sheet.webp` โดย `NN` เติม 0 เหมือนไฟล์วิดีโอ (`01`) (§16)        |
| สร้าง thumbnail / sprite จาก | สคริปต์ใหม่ `tests/thumbnail.spec.ts` (§16.4)                                                                             |
| Skip (intro / outro)         | **ใช้ร่วมทุกภาษา** เก็บต่อ episode (`episodes.skips`) แม้ track พากย์ยาวไม่เท่าต้นฉบับ (ตัดสิน 2026-10-14)                |
| ลำดับเวลาเริ่มเล่น           | **`?t=` ใน URL ชนะเสมอ** เหนือตำแหน่งที่ player จำไว้ (Back / รีโหลด) (2026-10-14)                                        |
| `watch_histories.track_id`   | **ลบออก** (migration `20261013195659_drop_watch_history_track`) เก็บแค่ episode + ตำแหน่ง (2026-10-14)                    |
| คลิกบนวิดีโอ                 | **ไม่ทำอะไร** Play / Pause ได้จากปุ่มและปุ่มลัดเท่านั้น (2026-10-14)                                                      |

---

## 1. สิ่งที่มีอยู่แล้วและจะนำกลับมาใช้

| ของที่มีอยู่                                                          | ไฟล์                                                             | ใช้ทำอะไรใน LMP                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Route ส่ง byte วิดีโอ (Range, 206, ยกเลิก stream เมื่อ request abort) | `src/app/api/stream/[vid]/route.ts`                              | MSE fetch ทีละ fragment ด้วย `Range: bytes=start-end` และเป็น fallback ของ native `src` |
| Route manifest                                                        | `src/app/api/stream/[vid]/manifest/route.ts`                     | หน้า watch ไม่เรียก เพราะ page ส่ง manifest มาเป็น props (§3.7) เก็บไว้ใช้ debug        |
| `readTrack(trackId)` (`"use cache"` + `cacheTag("tracks/<id>")`)      | `src/app/api/stream/[vid]/actions/read.ts`                       | ข้อมูล manifest (`mimeCodec`, `duration`, `initEnd`, `fragments`)                       |
| Art route + `readThumbnail` + `isSafeMediaPath` + `IMAGE_EXTENSIONS`  | `src/app/api/art/[kind]/[id]/*`, `src/libs/media.ts`             | poster/thumbnail และเพิ่ม kind `sprite` (§16.3)                                         |
| `paramValidator` (`z.uuid()`)                                         | `src/libs/validator.zod.ts`                                      | ตรวจ `vid` ในหน้า watch และใน `/api/progress`                                           |
| `withAuth` / `withGuard`                                              | `src/actions/auth/index.ts`                                      | `withAuth` สำหรับ reader/Server Action, `withGuard` สำหรับ `/api/progress`              |
| ตาราง `preferences` (`audioLanguage`, `autoplayNext`, `autoSkip`)     | `src/drizzle/schema/accounts.schema.ts`                          | ค่าเริ่มต้นของเสียงพากษ์ / Autoplay Next / Auto Skip                                    |
| ตาราง `watch_histories` (1 แถวต่อ account ต่อ content)                | `src/drizzle/schema/activities.schema.ts`                        | resume และบันทึก progress                                                               |
| `episodes.skips`, `episodes.thumbnail`, `tracks.fragments`            | `src/drizzle/schema/contents.schema.ts`, `src/types/schema.d.ts` | ปุ่ม Skip, Auto Skip, poster, binary search ตอน seek                                    |
| Pattern ของ zustand store (`createStore` + context + `useRef`)        | `src/stores/main/state.ts`, `src/stores/main/index.tsx`          | ต้นแบบของ `stores/player/`                                                              |
| Column helpers (`trackColumns`, `episodeColumns`, …)                  | `src/drizzle/table-columns.ts`                                   | select เฉพาะ column ที่ต้องใช้                                                          |
| `UNSAFE_PortalProvider` (`react-aria/PortalProvider`)                 | `lmp/lmp.tsx`                                                    | ให้ overlay ของ HeroUI portal เข้า container ของ player เพื่อให้แสดงตอน fullscreen       |
| `cls()`                                                               | `src/libs/utils.ts`                                              | รวม className                                                                           |
| Hugeicons                                                             | `@hugeicons/core-free-icons`                                     | ไอคอนทั้งหมด (§6.1)                                                                     |
| `throttle` จาก es-toolkit                                             | `es-toolkit`                                                     | throttle การ seek ตอนกดลูกศรค้าง และ `setPositionState`                                 |
| โครงการสแกนโฟลเดอร์ + ตรวจไฟล์ก่อนเขียน DB                            | `tests/track.spec.ts`                                            | ต้นแบบของ `tests/thumbnail.spec.ts`                                                     |

> **ไม่ใช้** `useCountdownTimer` (`src/hooks/use-countdown.ts`) สำหรับ countdown ของ Autoplay Next
> เพราะมันเริ่มนับทันทีที่ mount, มี `console.log` ค้างอยู่, `useCallback` ไม่ได้ใส่ `duration` ใน deps
> และนับด้วย `setInterval` ซึ่งเพี้ยนเมื่อแท็บถูก throttle LMP นับจาก deadline แทน (§8.3)

### สิ่งที่ยังไม่มีและต้องสร้าง

- หน้า `/watch` (page, validator.nuqs, readers, components, `watch-notice`)
- `POST /api/progress` (beacon บันทึก progress)
- Server Action อัปเดต `preferences`
- `stores/player/` (volume, muted แบบ per-device ใน `localStorage`)
- column sprite sheet ใน `episodes` + art kind `sprite` + `tests/thumbnail.spec.ts`
- ตัว LMP ทั้งหมด

---

## 2. ภาพรวมสถาปัตยกรรม

```
Server (RSC, plain SSR)                          Client
───────────────────────────────                  ─────────────────────────────────────────────────────
watch/page.tsx
  ├─ parse ?vid (episodeId), ?audio, ?t (nuqs)
  ├─ vid ผิดรูปแบบ → <WatchNotice kind="invalid-link"/>
  ├─ readWatchEpisode(vid) → null → <WatchNotice kind="not-found"/>
  ├─ Promise.all([readContentEpisodes,
  │               readProgress, readPreference])
  ├─ resolve prev/next + startAt
  └─ render ───────────────────────────────────► <LmpLoader {...props}/>       (next/dynamic, ssr:false, ไม่มี key)
                                                   └─ <Lmp>                    mount ครั้งเดียวตลอดที่อยู่หน้า watch
                                                        ├─ <PlayerStoreProvider>
                                                        ├─ <div container>     ← ตัวที่เข้า fullscreen (ค้างข้ามตอน)
                                                        │    ├─ <video>        ← element เดิมตลอด (PiP ค้างข้ามตอน)
                                                        │    └─ <LmpSession key={track.id}>   state ต่อตอน
                                                        │         ├─ use-media-source  (ต่อ MediaSource ใหม่เข้า <video> เดิม)
                                                        │         ├─ use-lmp-hotkeys / use-media-session
                                                        │         ├─ use-watch-progress / use-skips / use-autoplay-next
                                                        │         ├─ overlays (OSD, skip, countdown, stopped, spinner, help)
                                                        │         ├─ <TopBar> (Back + ชื่อเรื่อง + ปุ่ม Playlist)
                                                        │         └─ <ControlBar> (เวลา, progress + preview, ปุ่ม, popover)
                                                        ├─ <PlaylistPanel>     ← เปิดค้างข้ามตอนได้ (§6.12)
                                                        └─ teardown ตอนออกจากหน้า watch (exit PiP, reset <video>)
```

หลักการ

1. **Server เป็นคนตัดสินใจ**ว่าเล่น track ไหน, ตอนก่อน/ถัดไปคือ track ไหน, เริ่มที่วินาทีเท่าไร แล้วส่งเป็น
   props ฝั่ง client ไม่ต้อง fetch อะไรเพิ่มนอกจาก byte วิดีโอ (และรูป sprite)
2. **`<video>` และ container ไม่ถูกสร้างใหม่ตอนเปลี่ยนตอน/เสียงพากษ์** — Next 16.4 เก็บ state ของ page
   ไว้เมื่อเปลี่ยนแค่ search params (ดูคอมเมนต์ใน `node_modules/next/dist/client/components/layout-router.js`:
   _"search params do not cause state to be lost"_) ดังนั้นเปลี่ยน `?vid=` แล้ว `<Lmp>` ยังเป็นตัวเดิม สิ่งที่
   reset ต่อตอนคือ `<LmpSession key={track.id}>` ซึ่งไม่มี `<video>` อยู่ข้างใน ผลคือ PiP และ fullscreen
   ค้างอยู่ได้ (§8.5)
3. **วิดีโอคือ source of truth** สถานะเล่น/หยุด/เวลา/เสียง อ่านจาก `HTMLVideoElement` ผ่าน event ไม่ copy
   ไปไว้ใน React state แล้วสั่งกลับ
4. **ทุก action มีทางเดียว**: ปุ่มบน UI, ปุ่มลัด, ดับเบิลแตะ และ Media Session เรียกฟังก์ชันชุดเดียวกัน
   (`actions.play()`, `actions.seekBy()`, …) จาก `use-lmp-controller` ไม่มี logic ซ้ำ

---

## 3. ฝั่ง Server: หน้า `/watch`

### 3.1 โครงไฟล์

```
src/app/(protected)/watch/
├── page.tsx                   Server Component: parse → load → resolve → render
├── validator.nuqs.ts          queryValidator = createSearchParamsCache({ vid, audio, t }) — vid = episodeId
├── utils.ts                   pick-track / resolve-adjacent / resolve-start-at / to-player-props (pure functions)
├── actions/
│   ├── read.ts                readWatchEpisode, readContentEpisodes, readProgress, readPreference
│   └── update.ts              updatePlaybackPreference (Server Action, withAuth)
└── components/
    ├── watch-notice.tsx       กล่องแจ้งเตือน 2 แบบ (§3.3)
    └── lmp/                   ตัว player ทั้งหมด รวม Playlist panel (§4)

src/app/api/progress/
├── route.ts                   POST beacon → upsert watch_histories → 204
└── validator.zod.ts           { trackId: z.uuid(), position: z.number().min(0) } (duration มาจาก track ใน DB)

src/stores/player/
├── state.ts                   createPlayerStore()
└── index.tsx                  PlayerStoreProvider + usePlayerStore(selector)
```

- ไม่ต้องมี `watch/layout.tsx` เพราะ page ไม่ remount ตอนเปลี่ยน search params (§2 ข้อ 2)
  `PlayerStoreProvider` อยู่ใน `lmp.tsx`
- **ต้องยืนยันตอน implement (เฟส 2)**: เลือกตอนใน Playlist panel แล้ว `<video>` เป็น element เดิม (เช่น ตั้ง
  `video.dataset.mountId` ตอน mount แล้วดูว่าไม่เปลี่ยน) ถ้าไม่ใช่ ให้ย้าย `<Lmp>` ขึ้นไปไว้ใน
  `watch/layout.tsx` และให้ page ส่ง props ผ่าน store แทน

### 3.2 ลำดับการโหลดข้อมูลใน `page.tsx`

```
**URL: `/watch?vid=<episodeId>&audio=<Locales>&t=<seconds>`** (แก้ 2026-10-13: เดิม `vid` = `tracks.id`)

- `vid` = `episodes.id` → URL ของตอนหนึ่งคงที่ไม่ว่าจะฟังภาษาไหน ลิงก์ที่แชร์/bookmark เปิดเป็นภาษาที่คนดูตั้งไว้
- `audio` (ไม่บังคับ, `parseAsStringEnum(Locales)`) ขอภาษาเจาะจง ใช้ตอนเปลี่ยนเสียงพากษ์และตอนไปตอนก่อน/ถัดไป
  (ส่งภาษาที่กำลังฟังไปด้วย) ค่าที่ไม่รู้จัก → `null`
- `/api/stream/[vid]` ยังรับ `tracks.id` เหมือนเดิม (route ภายในที่ player เรียกเอง)

```

1. const { vid, audio, t } = queryValidator.parse(await searchParams)
2. ถ้า !vid หรือ !z.uuid().safeParse(vid).success → return <WatchNotice kind="invalid-link" />
3. const current = await readWatchEpisode(vid) // episode + season + content + tracks ทุกภาษา (พร้อม manifest)
   ถ้า null → return <WatchNotice kind="not-found" />
4. const [episodes, progress, saved] = await Promise.all([ readContentEpisodes(current.content.id), // ทุก
   season ของ content นี้ เรียงตาม releasedOn, episodeNo // พร้อม synopsis และ tracks (id, language, isDubbed)
   ของแต่ละตอน readProgress(current.content.id), // withAuth: แถว watch_histories ของ account นี้
   readPreference() // withAuth: แถว preferences (อาจเป็น null → ใช้ default) ])
5. const preference = withDefaultPreference(saved)
6. const track = pickTrack(current.tracks, audio, preference.audioLanguage) // §3.4 ถ้า null (ตอนนี้ยังไม่มี
   track) → return <WatchNotice kind="not-found" />
7. render <LmpLoader {...toPlayerProps({ current, track, … })} /> // prev/next/startAt/playlist คำนวณข้างใน

````

- ขั้น 3 กับ 4 แยกกันเพราะขั้น 4 ต้องรู้ `content.id` ก่อน (`readWatchEpisode` และ `readContentEpisodes` cached
  อยู่แล้ว)
- `readWatchEpisode` / `readContentEpisodes` เป็นข้อมูลที่แชร์ทุก user → `"use cache"` + `cacheTag`
  (`episodes/<id>`, `contents/<id>/episodes`) + `cacheLife("hours")` ส่วน `readProgress` / `readPreference`
  เป็นข้อมูลรายบุคคล → query ตรง
- `readWatchEpisode` อ่าน manifest ของทุก track ของตอนในครั้งเดียว (ตอนหนึ่งมีไม่กี่ภาษา) แล้วค่อยเลือกหลังรู้
  preference จึงยังเป็น 2 รอบ query เท่าเดิม
- **ห้ามส่ง path ให้ client**: select เฉพาะ column ที่ปลอดภัย (ไม่มี `path`, `sources`, `poster`, `thumbnail`,
  `sprite`) รูปทั้งหมดใช้ `/api/art/<kind>/<id>`
- เมื่อ `readWatchEpisode` กับ `readTrack()` ของ stream route ใช้ query คล้ายกัน ให้ย้ายไป
  `@/actions/episodes/read.ts` ตามกฎ "มี route ที่สองใช้ = promote" (แต่ตัวที่ส่งเข้า client ต้องไม่มี path)

### 3.3 `watch-notice.tsx` — กล่องข้อความแจ้งเตือน

Server Component ธรรมดา **ไม่ใช่ modal**: เป็นกล่องข้อความกลางพื้นที่ของ player (เต็ม viewport พื้นดำเหมือน
player-frame ให้หน้าไม่กระโดด) page `return` ตัวนี้แทน player ข้อความเป็นภาษาอังกฤษตามดีไซน์

```tsx
type WatchNoticeProps = { kind: "invalid-link" | "not-found" }
export function WatchNotice({ kind }: WatchNoticeProps) { … }
````

| `kind`         | เมื่อไร                                                | ไอคอน          | หัวข้อ            | ข้อความ                                              | ปุ่ม                        |
| -------------- | ------------------------------------------------------ | -------------- | ----------------- | ---------------------------------------------------- | --------------------------- |
| `invalid-link` | ไม่มี `?vid=` หรือ `vid` ไม่ใช่ UUID                   | `Alert02Icon`  | "Invalid link"    | "This link has no video ID, or the ID is malformed." | "Browse titles" → `/browse` |
| `not-found`    | `vid` ถูกรูปแบบแต่ไม่มีตอนนี้ หรือตอนนี้ยังไม่มี track | `VideoOffIcon` | "Video not found" | "It may have been removed or moved."                 | "Browse titles" → `/browse` |

- ข้อความเก็บในตาราง `const NOTICES: Record<WatchNoticeProps["kind"], …>` ใน component เดียว ไม่แยก 2
  component
- `role="status"` + หัวข้อเป็น `<h1>` (เป็นเนื้อหาหลักของหน้าในกรณีนี้)
- HTTP status จะเป็น 200 (ไม่ได้ผ่าน `notFound()`) ซึ่งรับได้สำหรับแอปส่วนตัวบน LAN
- กรณีไม่ได้ login ยังเป็นหน้าที่ของ `withAuth` (redirect ผ่าน ErrorBoundary) ไม่ใช่ notice นี้

### 3.4 กติกาเลือก track (`pickTrack`)

ใช้ตอนเปิดหน้า (เลือก track ของตอนใน `?vid=`)

1. ภาษาที่ขอ (`?audio=`)
2. `preference.audioLanguage` (ถ้าไม่เป็น `null`)
3. track ต้นฉบับ (`isDubbed = false`)
4. track แรกของตอนนั้น

ตอนที่ไม่มี track เลย → notice `not-found` (Prev / Next / Playlist ไม่พาไปตอนแบบนี้อยู่แล้ว)

### 3.5 กติกา Prev / Next (ภาษาเดิมเท่านั้น)

- เรียงทุกตอนของ **content** ตาม `(season.releasedOn, episode.episodeNo)` แล้วเอาตอน**ที่มี track**ก่อน/ถัดจาก
  ตอนปัจจุบัน → ตอนสุดท้ายของ Season 1 กด Next จะไป EP1 ของ Season 2
- **ตอนก่อน/ถัดไปต้องมี track ภาษาเดียวกับที่กำลังฟังอยู่** ไม่งั้นนับว่า**ไม่มี** (`null`) — Prev / Next
  ไม่เปลี่ยน ภาษาให้เอง ตัวอย่าง: ต้นฉบับมี 12 ตอน พากย์ไทยมี 6 ตอน ดูพากย์ไทย EP6 → `next = null` (ปุ่ม Next
  / Shift+N disabled เหมือนตอนสุดท้าย) แต่ดูต้นฉบับ EP6 → `next` = EP7 ต้นฉบับ
- ตอนถัดไปที่มีอยู่แต่ไม่มีภาษานี้ ส่งมาเป็น `nextFallback` (ในภาษาที่ `pickTrack(tracks, null, preference)`
  จะ เลือก ปกติคือต้นฉบับ) ให้การ์ดจบตอนเสนอ "Watch in Original" (§8.3)
- ไปตอนก่อน/ถัดไปด้วย `/watch?vid=<episodeId>&audio=<ภาษาที่กำลังฟัง>` ภาษาจึงต่อเนื่องแน่นอน
- `prev` / `next` เป็น `null` → ปุ่ม disabled, ปุ่มลัดแสดง OSD "No previous episode" / "No next episode",
  Media Session handler เป็น `null`

### 3.6 `startAt`

1. `t` จาก URL ถ้ามี (ใช้ตอนเปลี่ยนเสียงพากษ์ และลิงก์ที่แชร์เวลา) clamp ให้อยู่ใน `[0, duration − 1]`
2. ถ้า `progress.episodeId === current.episode.id` และ `progress.completedAt === null` →
   `progress.positionSeconds`
3. ไม่งั้น `0`

ถ้า `startAt` เหลือไม่ถึง 10 วินาทีก่อนจบ ให้เริ่มที่ `0` แทน

### 3.7 Props ที่ส่งให้ LMP (`lmp/types.ts`)

```ts
type LmpProps = {
  track: {
    id: string
    language: Locales
    isDubbed: boolean
    mimeCodec: string
    duration: number
    initEnd: number
    fragments: Content.Fragment[]
  }
  audioTracks: { id: string; language: Locales; isDubbed: boolean }[] // tracks ทั้งหมดของตอนนี้
  episode: {
    id: string
    episodeNo: number
    title: string | null
    skips: Content.Skip[]
    spriteGrid: Content.SpriteGrid | null
  }
  season: { id: string; kind: Content.SeasonKind; seasonNo: number | null; title: string | null }
  content: { id: string; slug: string; title: string }
  prev: LmpAdjacent | null // { episodeId, language, episodeNo, seasonKind, seasonNo: number | null, title }
  next: LmpAdjacent | null // ภาษาเดียวกับ track ที่เล่นอยู่เท่านั้น (§3.5)
  nextFallback: LmpAdjacent | null // ตอนถัดไปที่ไม่มีภาษานี้ ในภาษาที่มันจะเล่น (§8.3)
  startAt: number
  preference: { autoplayNext: boolean; autoSkip: boolean }
  playlist: {
    seasons: { id: string; kind: Content.SeasonKind; seasonNo: number | null; title: string | null }[]
    episodes: {
      id: string
      seasonId: string
      episodeNo: number
      title: string | null
      synopsis: string | null
      languages: Locales[] // ภาษาที่ตอนนี้มี (ต้นฉบับก่อน), [] = ยังไม่มี track
    }[]
  }
  backHref: string
}
```

- `backHref` = หน้า season/content ของเรื่องนี้ (`/contents/${slug}?season=${seasonNo}`) แต่ตอนนี้ยังไม่มีหน้า
  content (มีแค่ `/browse`) → สร้างจาก helper เดียว `toBackHref()` ใน `watch/utils.ts` ซึ่งตอนนี้คืน `/browse`
  เมื่อหน้า content เสร็จแก้ที่เดียว

- ส่ง manifest มาใน props เลย แทนให้ client fetch `/manifest` → ตัด round-trip ก่อนภาพแรก (ตอน 24 นาที ≈ 360
  fragment ≈ 20 KB ใน RSC payload รับได้)
- `spriteGrid` ส่งแค่ตัวเลขของ grid ไม่มี path (§16)

### 3.8 `POST /api/progress`

1. `withGuard(request)` → `null` → `401`
2. `request.text()` → `JSON.parse` → `progressValidator.safeParse` → ไม่ผ่าน → `400`
3. body = `{ trackId, position }` (เดิมชื่อ `vid`) ดึง `episode_id`, `content_id`, `duration` ของ `trackId`
   จาก DB (ห้ามเชื่อค่าจาก client)
4. `insert … onConflictDoUpdate({ target: [accountId, contentId] })` ตั้ง `episodeId` (ไม่เก็บ `trackId`
   ตั้งแต่ 2026-10-14), `positionSeconds` (ปัดลง), `durationSeconds`, `watchedAt = now()` และ
   `completedAt = position ≥ 0.9 × duration ? now() : null`
5. ตอบ `204`

> `sendBeacon` ส่ง cookie ไปด้วย (same-origin) body เป็น
> `new Blob([JSON.stringify(body)], { type: "application/json" })`

### 3.9 `updatePlaybackPreference` (Server Action)

```ts
export const updatePlaybackPreference = withAuth(async (account, input: unknown) => { … })
```

- Zod:
  `z.object({ audioLanguage: z.enum(Locales).nullable(), autoplayNext: z.boolean(), autoSkip: z.boolean() }).partial()`
  (ต้องมีอย่างน้อย 1 field)
- upsert `preferences` ด้วย `onConflictDoUpdate({ target: preferences.accountId })` (account
  เก่าอาจยังไม่มีแถว)
- ถ้า `readPreference` ถูก cache ในอนาคต ต้อง `updateTag("preferences/<accountId>")` ตรงนี้
- client เรียกใน `startTransition` + `useOptimistic` (สลับทันที ถ้า error ค่อย revert + OSD error)

---

## 4. ฝั่ง Client: โครงไฟล์ของ LMP (kebab-case ทั้งหมด)

```
src/app/(protected)/watch/components/lmp/
├── lmp-loader.tsx             "use client": dynamic(() => import("./lmp"), { ssr: false, loading: <PlayerFrame/> })
├── lmp.tsx                    persistent: PlayerStoreProvider + container + <video> + teardown + <LmpSession key>
├── lmp-session.tsx            ต่อตอน (key={track.id}): ประกอบ hooks + overlays + control bar
├── player-frame.tsx           กรอบ aspect-video bg-black (ใช้ตอน loading และใน lmp.tsx กัน layout shift)
├── hotkeys.ts                 HOTKEYS: ตารางปุ่มลัดตัวเดียว ใช้ทั้งดักปุ่มและแสดงในหน้าต่างปุ่มลัด (§7.8)
├── types.ts                   LmpProps, LmpStatus, LmpActions, LmpHandoff
├── utils.ts                   formatTime, findFragmentIndex, clamp, languageLabel, spriteTile
├── controls/
│   ├── top-bar.tsx            Back + "EP01 • Content title" + ปุ่ม Playlist (§6.11)
│   ├── playlist-button.tsx
│   ├── control-bar.tsx
│   ├── time-display.tsx       เวลาที่เล่น (ซ้าย) / ความยาว (ขวา) เหนือ progress (§6.3)
│   ├── progress-bar.tsx       role="slider", คลิก/ลาก, buffered, skip markers, จุดหัวเล่น
│   ├── preview-thumbnail.tsx  ภาพตัวอย่างจาก sprite sheet (§6.2.4)
│   ├── play-button.tsx        ปุ่มวงกลมใหญ่กลางแถว
│   ├── seek-button.tsx        −10 / +10 (prop: offset)
│   ├── track-button.tsx       Prev / Next (prop: direction)
│   ├── volume-control.tsx     ปุ่มลำโพง + slider ที่กางตอน hover (§6.6)
│   ├── player-menu.tsx        กรอบเมนูใช้ร่วม (HeroUI Dropdown): หัวข้อ + ไอคอน + เส้นคั่น, anchor ที่ progress bar
│   ├── audio-menu.tsx         popover "Audio Tracks" (§6.9)
│   ├── preferences-menu.tsx   popover "Preferences": Autoplay Next, Auto Skip, Keyboard shortcuts (§6.10)
│   ├── pip-button.tsx
│   └── fullscreen-button.tsx
├── playlist/
│   ├── playlist-panel.tsx     desktop = DrawerComponent, มือถือ = panel ใน player (§6.12)
│   └── playlist-item.tsx      ปุ่มห่อการ์ดตอนกลาง `@/components/episode-card` (ดีไซน์เดียวกับหน้า content)
├── overlays/
│   ├── osd.tsx
│   ├── skip-button.tsx
│   ├── end-card.tsx           การ์ดจบตอน: Up next / Watch in Original / Replay (§8.6)
│   ├── stopped-overlay.tsx
│   ├── buffering-spinner.tsx
│   ├── shortcut-help.tsx      หน้าต่างรายการปุ่มลัด (§7.8)
│   └── double-tap-ripple.tsx  ป้าย "−10 s / +10 s" ฝั่งซ้าย/ขวา (§10.3)
└── hooks/
    ├── use-media-source.ts
    ├── use-lmp-controller.ts
    ├── use-lmp-hotkeys.ts
    ├── use-media-session.ts
    ├── use-picture-in-picture.ts
    ├── use-fullscreen.ts
    ├── use-watch-progress.ts
    ├── use-skips.ts
    ├── use-autoplay-next.ts
    ├── use-controls-visibility.ts
    ├── use-double-tap.ts
    ├── use-sprite-preview.ts
    ├── use-osd.ts
    └── use-video-event.ts     subscribe event ของ <video> แบบ useSyncExternalStore
```

- ทุกอย่างเป็น route-local เพราะมีแค่หน้า watch ใช้ ถ้าวันหน้ามีหน้าอื่นใช้ค่อย promote ไป `@/components/lmp/`
- ไม่มี barrel `index.ts`

### 4.1 แบ่งหน้าที่ `lmp.tsx` กับ `lmp-session.tsx`

| `lmp.tsx` (อยู่ตลอดที่อยู่หน้า watch)                                    | `lmp-session.tsx` (`key={track.id}`, สร้างใหม่ทุกตอน/ทุกภาษา)             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `PlayerStoreProvider`                                                    | `use-media-source` ต่อ MediaSource ของ track นี้เข้า `<video>` ของ parent |
| `containerRef` (ตัวที่ fullscreen), `videoRef`                           | `use-lmp-controller`, `use-lmp-hotkeys`, `use-media-session`              |
| `handoffRef` = `{ playing: boolean }` ส่งต่อให้ session ถัดไป            | `use-watch-progress`, `use-skips`, `use-autoplay-next`, `use-double-tap`  |
| teardown ตอนออกจากหน้า: exit PiP, `removeAttribute("src")`, `load()`     | overlays ทั้งหมด, `ControlBar`                                            |
| ใส่ `volume`/`muted` จาก store ให้ `<video>` ครั้งแรก                    | เมนูที่เปิด, skip ที่ข้ามแล้ว, countdown — reset เองเมื่อเปลี่ยนตอน       |
| `PlaylistPanel` (เปิดค้างได้หลังเลือกตอน, อ่าน `playlistOpen` จาก store) | `TopBar` (ชื่อตอนเปลี่ยนตาม session)                                      |

---

## 5. สถานะ (State) ของ player

### 5.1 State machine

```
            mount session
              │
              ▼
          ┌────────┐   loadedmetadata + seek ไป startAt เสร็จ
          │loading │ ───────────────────────────────┐
          └────────┘                                ▼
                                    play()     ┌────────┐
                 ┌──────────────── ◄────────── │ paused │ ◄───┐ pause()
                 ▼                              └────────┘     │
            ┌─────────┐  waiting   ┌───────────┐               │
            │ playing │ ─────────► │ buffering │ ── playing ──►│(กลับ playing)
            └─────────┘            └───────────┘               │
              │   │  └────────────────────────────────────────┘
              │   │ stop()
              │   ▼
              │ ┌─────────┐  play()  → seek 0 → playing
              │ │ stopped │ ─────────────────────►
              │ └─────────┘
              │ ended
              ▼
          ┌───────┐  play() → seek 0 → playing      (Autoplay Next: นับถอยหลัง → navigate)
          │ ended │
          └───────┘
     ทุกสถานะ ──(video.error + retry หมด + fallback ล้มเหลว)──► error
```

`LmpStatus = "loading" | "playing" | "paused" | "buffering" | "stopped" | "ended" | "error"`

- `stopped` ต่างจาก `paused` ตรงที่: แสดง `stopped-overlay` (poster), หยุดโหลด buffer และ**ไม่บันทึก
  progress**
- `buffering` มาจาก `waiting` จบเมื่อ `playing` / `canplay` แสดง spinner หลังรอเกิน 300 ms (กันกระพริบ)
- session ใหม่เริ่มที่ `loading` เสมอ แล้วถ้า `handoffRef.current.playing` เป็นจริงจะ `play()` ต่อเองหลัง seek
  ไป `startAt` เสร็จ

### 5.2 ของแต่ละชิ้นเก็บที่ไหน

| ข้อมูล                                              | เก็บที่                                       | เหตุผล                                  |
| --------------------------------------------------- | --------------------------------------------- | --------------------------------------- |
| `currentTime`, `buffered`, `paused`, `volume` จริง  | `HTMLVideoElement`                            | source of truth                         |
| คิว append, `AbortController`, `SourceBuffer`       | `useRef` ใน `use-media-source`                | เปลี่ยนบ่อย ไม่ต้อง re-render           |
| `status`                                            | `useState` ใน `use-lmp-controller`            | เปลี่ยนไม่บ่อย UI หลายจุดใช้            |
| เวลาปัจจุบันสำหรับ UI                               | `useSyncExternalStore` เฉพาะใน `time-display` | re-render แค่ component เดียว           |
| `volume`, `muted`                                   | `stores/player` (persist `localStorage`)      | ค่าต่ออุปกรณ์                           |
| เล่นต่อหลังเปลี่ยนตอนไหม                            | `handoffRef` ใน `lmp.tsx`                     | ต้องรอดข้าม session ไม่ต้องอยู่ใน store |
| `autoplayNext`, `autoSkip`, `audioLanguage`         | DB `preferences` → props → `useOptimistic`    | ค่าต่อ account                          |
| เมนูที่เปิด, OSD, controls visible, หน้าต่างปุ่มลัด | `useState` ใน component นั้น ๆ                | ชั่วคราว                                |
| Playlist panel เปิดอยู่ไหม                          | `stores/player` (ไม่ persist)                 | ต้องรอดข้าม session                     |
| skip ที่ข้ามแล้ว / ผู้ใช้ undo แล้ว                 | `useRef<Set<string>>` ใน `use-skips`          | อยู่แค่ระหว่าง session                  |

### 5.3 `stores/player/`

```ts
type State = { volume: number; muted: boolean; playlistOpen: boolean }
type Actions = {
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  setPlaylistOpen: (open: boolean) => void
}
```

- `persist` middleware ของ zustand กับ `createStore`, key `"lmp:player"` เก็บเฉพาะ `volume`, `muted`
  (`partialize`) `playlistOpen` ไม่ persist (อยู่แค่ระหว่างอยู่หน้า watch)
- LMP โหลดแบบ `ssr: false` จึงอ่าน `localStorage` ตอนสร้าง store ได้เลย ไม่มี hydration mismatch
- ครอบ `localStorage` ด้วย try/catch (private mode) อ่านไม่ได้ใช้ default `volume = 1`, `muted = false`
- เลือก slice เล็กที่สุดเสมอ (`usePlayerStore((state) => state.volume)`)

---

## 6. Controls

### 6.1 Layout

ตาม `docs/design/00-Overview.png`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ‹  EP01 • Content title                                               ☰▷    │ ← top bar (§6.11)
│                                                                              │
│                          ┌──────────────┐                                    │
│                          │    +10 s     │  ← OSD                             │
│                          └──────────────┘                                    │
│                                                              [ Skip intro ]  │ ← §8.1
│ 00:00                                                                24:00   │ ← เวลา (§6.3)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓●░░░░░░░░░▒▒▒▒▒▒──────────────────────────────────────────  │ ← progress
│ 文A  🔊━━○               |◁   ↺10   (▶)   10↻   ▷|                ⧉   ⤢   ⚙   │
└──────────────────────────────────────────────────────────────────────────────┘
   ▓ เล่นแล้ว (theme)  ░ buffered  ▒ ช่วง intro/outro (สีจาง)  ● หัวเล่น   ━━○ slider ตอน hover
```

- แถวล่างแบ่ง 3 กลุ่ม: **ซ้าย** = Audio tracks, Mute (+ slider) · **กลาง** (อยู่กลาง player เสมอ) = Prev, −10,
  Play/Pause, +10, Next · **ขวา** = PiP, Fullscreen, Preferences
- **ไม่มีปุ่ม Stop** (§6.5) และไม่มีตัวเวลาในแถวปุ่ม (ย้ายไปเหนือ progress)

ไอคอน (เลือกตัวที่ใกล้ดีไซน์ที่สุด ยืนยันด้วยตาตอนวาด):

| ปุ่ม                         | Hugeicons                                               | aria-label                                              |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| Back                         | `ArrowLeft01Icon`                                       | "Back"                                                  |
| Playlist                     | `ListVideoIcon` (เส้น + ▷ ตรงดีไซน์กว่า `PlayListIcon`) | "Playlist" / ในหัว panel: "Close playlist"              |
| Audio tracks                 | `TranslateIcon` (สำรอง `LanguageSquareIcon`)            | "Audio tracks"                                          |
| Mute                         | `VolumeHighIcon` / `VolumeLowIcon` / `VolumeMute02Icon` | "Mute (Shift+M)" / "Unmute (Shift+M)"                   |
| Prev / Next                  | `PreviousIcon` / `NextIcon`                             | "Previous episode (Shift+P)" / "Next episode (Shift+N)" |
| −10 / +10                    | `GoBackward10SecIcon` / `GoForward10SecIcon`            | "Back 10 seconds (←)" / "Forward 10 seconds (→)"        |
| Play / Pause                 | `PlayIcon` / `PauseIcon` ในวงแหวนขาว (ใหญ่กว่าปุ่มอื่น) | "Play (Space)" / "Pause (Space)"                        |
| PiP                          | `PictureInPictureOnIcon` / `PictureInPictureExitIcon`   | "Picture-in-picture (Shift+I)"                          |
| Fullscreen                   | `ArrowExpandIcon` / `ArrowShrinkIcon`                   | "Fullscreen (Shift+F)" / "Exit fullscreen (Shift+F)"    |
| Preferences                  | `PreferenceHorizontalIcon`                              | "Preferences"                                           |
| หัว Audio Tracks             | `MusicNote01Icon`                                       | —                                                       |
| หัว Preferences              | `SlidersHorizontalIcon`                                 | —                                                       |
| Keyboard (แถวใน Preferences) | `KeyboardIcon`                                          | "Keyboard shortcuts (Shift+/)"                          |

- import ไอคอนทีละตัว ขนาด 24–28 px (ปุ่ม Play ในวงแหวน ~56 px), `strokeWidth={1.5}`
- ทุกปุ่มเป็น `<button type="button">` มี `aria-label` และ `title` ที่บอกปุ่มลัด
- ปุ่ม PiP / Fullscreen ซ่อนเมื่อเบราว์เซอร์ไม่รองรับ
- จอแคบ (< 640 px): ซ่อน ±10 วิ (มือถือใช้ดับเบิลแตะแทน §10.3) และย่อขนาดปุ่ม

### 6.2 Progress bar

#### 6.2.1 พฤติกรรม

- **คลิก** ที่ตำแหน่งใดก็ได้ → `seekTo(ratio × duration)` ทันที (ตาม spec)
- **ลาก**: `pointerdown` → `setPointerCapture` → ระหว่างลากอัปเดตแค่หัวเล่น + preview (ไม่ seek จริงทุก pixel
  เพราะแต่ละ seek จะ abort fetch ของ MSE) → `pointerup` ค่อย `seekTo` ครั้งเดียว ระหว่างลากถ้ากำลังเล่นให้
  pause ชั่วคราวแล้วเล่นต่อหลังปล่อย
- **Hover** (เมาส์): แสดง preview (§6.2.4) + เวลา ณ ตำแหน่ง cursor + ชื่อช่วงถ้าอยู่ใน skip range ("Intro")
- ขยายแถบตอน hover/drag (4 px → 6 px) และ hit area สูง ≥ 16 px (มือถือ ≥ 24 px)
- ratio จาก `getBoundingClientRect()` ตอน `pointerdown` clamp เป็น `[0, 1]`

#### 6.2.2 การวาด

- 3 ชั้น: track `bg-white/30`, buffered `bg-white/50` (จาก `video.buffered` อาจมีหลายช่วงเพราะ evict), played
  `bg-theme` (`#05d6a2` ตรงกับดีไซน์)
- จุดหัวเล่น `bg-theme` แสดงตอน hover / drag / focus (ตาม 01-Actions) ปกติซ่อน (ตาม 00-Overview)
- skip markers จาก `episode.skips` เป็นแถบสีจาง
- ระหว่างเล่นอัปเดต played ด้วย `requestAnimationFrame` เขียน `style.transform = scaleX(r)` ผ่าน ref (ไม่
  re-render React) หยุด rAF เมื่อ pause/ซ่อนแท็บ buffered วาดใหม่เมื่อ `progress` และหลัง `updateend`

#### 6.2.3 A11y

`role="slider"`, `aria-valuemin=0`, `aria-valuemax={duration}`, `aria-valuenow={floor(currentTime)}`,
`aria-valuetext="5 นาที 12 วินาที จาก 21 นาที"` ปุ่มลูกศรจัดการโดย hotkey ระดับ window อยู่แล้ว

#### 6.2.4 Hover preview thumbnail (sprite sheet)

- ใช้ได้เมื่อ `episode.spriteGrid !== null` (สร้างโดย `tests/thumbnail.spec.ts` §16) ไม่มีก็แสดงแค่เวลา
- รูป: `/api/art/sprite/<episodeId>` (แชร์กันทุกภาษาของตอนนั้น)
- **โหลดล่วงหน้า**: หลัง `canplay` ครั้งแรก ใช้ `requestIdleCallback` (fallback `setTimeout`) สร้าง
  `new Image()` ตั้ง `fetchPriority = "low"` แล้ว `decode()` เก็บสถานะ `ready` ใน `use-sprite-preview`
  ถ้ายังไม่ ready ตอน hover แสดงแค่เวลา
- คำนวณ tile (`spriteTile` ใน `lmp/utils.ts`, pure):
  ```ts
  index = Math.min(Math.floor(time / grid.interval), grid.count - 1)
  x = (index % grid.columns) * grid.width
  y = Math.floor(index / grid.columns) * grid.height
  ```
- วาดเป็น `<div>` ขนาด `grid.width × grid.height` จาก DB `background-image: url(...)`,
  `background-position: -${x}px -${y}px` **ไม่ใช้ `next/image`** เพราะ optimizer จะย่อทั้งแผ่นแล้วพิกัดเพี้ยน
- หน้าตาตาม 01-Actions: กรอบมุมโค้งเล็ก กว้าง ~200 px, **เวลาเป็นป้ายเล็กพื้นดำโปร่งกลางขอบล่างภายในภาพ**,
  ถ้าอยู่ใน skip range มีป้ายชื่อช่วงเล็ก ๆ เหนือภาพ
- ช่อง sprite เป็น **192×108** ตามดีไซน์แล้ว (§16.6 ✅) แสดง 1:1 ตามขนาดใน `spriteGrid` ไม่ขยาย
- ตำแหน่ง: กึ่งกลางเหนือ cursor แล้ว clamp ไม่ให้ล้นขอบซ้าย/ขวาของ progress bar
- มือถือ: แสดงระหว่างลากด้วยนิ้ว (ไม่มี hover)
- อัปเดตตำแหน่งด้วย rAF ตอน `pointermove` (ไม่ re-render ทุก event)

#### 6.2.5 ผลการทำเฟส 10 (✅ เสร็จ 2026-10-14)

ไฟล์: `controls/preview-thumbnail.tsx`, `hooks/use-sprite-preview.ts` (ใหม่), `controls/progress-bar.tsx`,
`controls/control-bar.tsx`, `lmp-session.tsx`, `utils.ts` (`spriteTile`)

- `PreviewThumbnail` ถูกสั่งผ่าน ref (`show(time, ratio)` / `hide()`) เขียน DOM ตรง ๆ: ตำแหน่ง,
  `background-position` ของช่อง, เวลา และป้ายช่วง skip → progress bar ไม่มี state ของ hover แล้ว ขยับเมาส์ไม่
  re-render เลย (เดิม `setHover` ทุก `pointermove`) pointer event หลายตัวในเฟรมเดียวรวมเป็นการวาดครั้งเดียว
- ยังไม่ ready / ตอนไม่มี sprite → แสดงป้ายเวลาอย่างเดียว (แบบเดิม)
- preload: หลัง `canplay` → `requestIdleCallback` (timeout 2 วิ, Safari ใช้ `setTimeout` 300 ms) →
  `new Image()` + `fetchPriority = "low"` + `decode()`
- ผลทดสอบ (Chrome 155, 1280×720): โหลด sprite 1 request หลังวิดีโอพร้อม; hover 0:00 → ช่อง `0px 0px`
  ชิดขอบซ้าย bar, 11:55 → `-192px -756px` (ช่อง 71) ภาพตรงฉากจริงที่ 11:55, 23:47 → `-384px -1512px` ชิดขอบขวา
  bar, ออกจาก bar → ซ่อน; ไม่มี error ใน console
- ข้อสังเกต: ตอน controls ซ่อนระหว่างเล่น การขยับเมาส์ครั้งแรกแค่เรียก controls กลับมา (bar เป็น
  `pointer-events-none` ตอนซ่อน) preview จึงขึ้นตั้งแต่การขยับครั้งที่สอง; sprite สร้างจาก track พากย์ (§16.7)
  ซึ่งยาวกว่าต้นฉบับ ~20 วิ ภาพ preview ตอนดูต้นฉบับอาจคลาดได้ไม่กี่วินาที (ใช้ร่วมทุกภาษาเหมือน skips)
- ยังไม่ได้ทดสอบ: ตอนที่ไม่มี sprite (ข้อมูลตอนนี้มี sprite ครบทุกตอน), ลากด้วยนิ้วบนมือถือจริง

### 6.3 Time display

ตามดีไซน์ (ไม่ใช่ `05:12 / 21:00` ก้อนเดียวแบบ spec ข้อความเดิม)

- สอง `<span>` ในแถวเหนือ progress bar: **ซ้าย** = เวลาที่เล่น, **ขวา** = ความยาวทั้งตอน
- `duration < 3600` → `mm:ss` ทั้งสองฝั่ง (`05:12` … `24:00`), ≥ 1 ชม. → `h:mm:ss` ทั้งสองฝั่ง (`0:05:12` …
  `1:42:00`)
- `duration` จาก `track.duration` (props) ไม่ใช่ `video.duration` (ก่อน `sourceopen` เป็น `NaN`)
- ระหว่างลาก progress ฝั่งซ้ายแสดงเวลาที่กำลังลาก
- ตัวเล็ก ~13 px, `tabular-nums` กันตัวเลขขยับ
- Playlist panel เปิดอยู่ (มือถือแนวนอน) → ฝั่งขวาถูก panel บัง (ตาม 02-Playlist) ยอมรับ · desktop เป็น Drawer ทับทั้ง player
- `formatTime(seconds, totalSeconds)` ใน `lmp/utils.ts` pure function: `Math.floor`, ค่าติดลบ/NaN → `0`

### 6.4 Play / Pause

- `play()`:
  - `status === "stopped"` หรือ `"ended"` → `seekTo(0)` + `resumeBuffering()` ก่อน แล้วค่อย `video.play()`
  - `catch` `NotAllowedError` (autoplay ถูกบล็อก) → `status = "paused"` + `stopped-overlay` พร้อมปุ่ม Play
    ใหญ่ / `AbortError` (ถูก pause ทับ) ให้เงียบ
- `pause()`: `video.pause()` / `togglePlay()`: ดูจาก `video.paused`
- **คลิกที่ตัววิดีโอไม่ทำอะไร** (แก้ 2026-10-14 ตามเจ้าของโปรเจกต์: Play / Pause ได้จากปุ่มและปุ่มลัดเท่านั้น)
  ไม่มี พฤติกรรมดับเบิลคลิก
- มือถือ แตะ = แสดง/ซ่อน controls, ดับเบิลแตะซ้าย/ขวา = ±10 วิ (§10.3)

### 6.5 Stop

**ไม่มีปุ่มบน UI** ตามดีไซน์ เรียกได้จาก `Shift+S` (§7.1) และ Media Session action `stop` (§11.1) เท่านั้น

```
stop():
  1. video.pause()
  2. suppressProgress = true            // use-watch-progress ไม่ส่ง beacon จาก seeked / pagehide ในสถานะนี้
  3. ส่ง progress ล่าสุด (ตำแหน่งก่อน stop) หนึ่งครั้ง
  4. mse.stopBuffering()                // abort fetch ที่ค้าง และไม่ prefetch ต่อ
  5. video.currentTime = 0
  6. status = "stopped"                 // poster + ปุ่ม Play ใหญ่
  7. exit PiP ถ้าอยู่ — fullscreen คงไว้
  8. mediaSession.playbackState = "paused"
```

- Play จาก stopped → `resumeBuffering()` → เล่นจาก 0 → `suppressProgress = false`
- Stop ซ้ำตอน stopped = ไม่ทำอะไร
- Seek ระหว่าง stopped → ออกจาก stopped เป็น paused ที่ตำแหน่งนั้น (ไม่เล่นเอง)

### 6.6 Volume / Mute

- ดีไซน์มีแค่ปุ่มลำโพง → **slider กางออกตอน hover**: slider แนวนอนกว้าง ~96 px กางออกทางขวาของปุ่มเมื่อ hover
  กลุ่ม (ปุ่ม + slider) หรือ focus อยู่ในกลุ่ม (`group-hover` / `group-focus-within` + transition
  ความกว้าง/opacity) ยุบหลังเมาส์ออก 300 ms ระหว่างลากไม่ยุบ ปุ่มลัด ↑/↓ กาง slider ชั่วคราว 1.5 วิ คู่กับ OSD
- มือถือไม่มี hover → แตะปุ่มลำโพง = mute อย่างเดียว ปรับเสียงด้วยปุ่มเสียงของเครื่อง
- Slider 0–100% เป็น div `role="slider"` (โครงเดียวกับ progress ถ้าโค้ดซ้ำกันมากให้แยก `slider.tsx` ใช้ร่วม)
  ลาก/คลิกได้, wheel บนปุ่มลำโพงหรือ slider = ±5%
- `setVolume(v)`: `v = Math.round(clamp(v, 0, 1) * 20) / 20` (ขั้น 5% กัน float เพี้ยน) → `video.volume = v` →
  store → ถ้า `v > 0 && muted` → unmute
- `toggleMute()`: `video.muted = !video.muted` → store ถ้า unmute ตอน volume = 0 ให้ตั้ง 0.5
- ไอคอน: muted หรือ 0 → `VolumeMute02Icon`, ≤ 50% → `VolumeLowIcon`, > 50% → `VolumeHighIcon`
- ฟัง `volumechange` sync กลับเข้า store (กรณีเปลี่ยนจาก OS/PiP)
- **iOS Safari**: `video.volume` อ่านได้อย่างเดียว → ตั้งแล้วอ่านกลับ ถ้าไม่เปลี่ยนให้ซ่อน slider เหลือปุ่ม
  mute

### 6.7 Backward / Forward 10 วินาที

- `seekBy(delta)`: `target = clamp(base + delta, 0, duration − 0.1)` โดย
  `base = pendingSeekRef ?? video.currentTime` (กดรัวเร็วกว่าที่ seek เสร็จ เวลายังบวกสะสมถูก)
- OSD "+10 s" / "−10 s" กดซ้ำภายใน 1 วิรวมเป็น "+30 s"
- `target` เลยจุดจบ → ไปที่ `duration − 0.1` แล้ว `ended` ทำงานตามปกติ

### 6.8 Prev / Next track

- `goTo(target: LmpAdjacent)`: ส่ง progress ของตอนปัจจุบัน (beacon) →
  `handoffRef.current.playing = !video.paused || status === "ended"` →
  `router.push(\`/watch?vid=${target.episodeId}&audio=${target.language}\`)`(push ให้ปุ่ม Back กลับตอนเดิมได้;`target.language`= ภาษาที่กำลังฟัง สำหรับ prev/next หรือภาษาของ`nextFallback`
  เมื่อกด "Watch in Original")
- page render ใหม่ด้วย props ใหม่ → `<LmpSession>` ตัวเก่า unmount (ถอด MediaSource) → ตัวใหม่ mount → ต่อ
  MediaSource ใหม่เข้า `<video>` เดิม → seek ไป `startAt` → ถ้า handoff บอกว่าเล่นอยู่ก็ `play()`
- **Autoplay policy**: เป็น element เดิมที่เคยเล่นมีเสียงมาแล้ว + client navigation ใน document เดิม → Chrome
  / Edge / Firefox / Safari ยอมให้ `play()` ต่อได้ ถ้ายังถูกบล็อก → `NotAllowedError` → ปุ่ม Play ใหญ่
- ไม่มี prev/next: ปุ่ม `aria-disabled` (ยังโฟกัสได้ให้อ่าน tooltip)
- Tooltip: "Next: S2 · EP01 Episode title"

### 6.9 ตัวเลือกเสียงพากษ์ (popover "Audio Tracks")

ตาม `docs/design/01-Actions.png`: popover มุมซ้ายล่าง เหนือ progress bar

```
┌──────────────────────┐
│ ♫  Audio Tracks      │
│ ──────────────────── │
│ Original (日本語)  ✓ │
│ ไทย                  │
└──────────────────────┘
```

- ปุ่มแสดงเมื่อ `audioTracks.length > 1`
- ชื่อภาษาเป็น**ภาษาของตัวเอง** (endonym):
  `endonym = new Intl.DisplayNames([language], { type: "language" }).of(language)` (`ja-JP` → `日本語`,
  `th-TH` → `ไทย`) track ต้นฉบับ = `Original (${endonym})`, พากย์ = `endonym` เก็บ `Intl.DisplayNames`
  ต่อภาษาไว้ใน `Map` ระดับ module ฟอนต์ต้องครอบคลุมญี่ปุ่น/ไทย (Noto Sans JP / Noto Sans Thai มีใน
  `src/constants/fonts.ts` แล้ว)
- ตัวที่เลือก: ตัวหนา สีขาว + ✓ ชิดขวา / ตัวอื่น: สีขาวจาง
- กรอบใช้ `player-menu.tsx` (HeroUI `Dropdown`) ร่วมกับ Preferences
- `Dropdown.Menu selectionMode="single"` → React Aria ให้ `role="menu"` + `menuitemradio` + `aria-checked` เอง
- เลือกภาษาใหม่:
  ```
  1. ภาษาเดิม → ปิดเมนู
  2. startTransition(() => updatePlaybackPreference({ audioLanguage: language }))
  3. handoffRef.current.playing = !video.paused
  4. switchAudio(language) → router.replace(`/watch?vid=${episode.id}&audio=${language}&t=${Math.floor(video.currentTime)}`)
  ```
  ใช้ `replace` เพราะเป็นตอนเดิม PiP/fullscreen ค้างอยู่ได้เหมือนเปลี่ยนตอน
- track ต่างภาษาอาจยาวต่างกัน 1–2 วิ ยอมรับได้ `startAt` ถูก clamp ด้วย `duration` ของ track ใหม่
- ปิดเมนูด้วย `Escape` / คลิกข้างนอก โดย React Aria (ในเมนู `Space` และลูกศรใช้เลือก item ไม่ใช่ปุ่มลัด: `use-lmp-hotkeys.ts`)

### 6.10 Autoplay Next / Auto Skip (popover "Preferences")

ตาม `docs/design/01-Actions.png`: popover มุมขวาล่าง เหนือ progress bar

```
┌────────────────────────────────┐
│ ⚟  Preferences                 │
│ ────────────────────────────── │
│ Autoplay Next           [ ●━]  │
│ Auto Skip               [━○ ]  │
│ ────────────────────────────── │
│ ⌨  Keyboard shortcuts  Shift+/ │   ← เพิ่มจากดีไซน์ (ทางเข้าหน้าต่างปุ่มลัดด้วยเมาส์ §7.8)
└────────────────────────────────┘
```

- สวิตช์เล็กชิดขวา, ข้อความ 14 px

- toggle เป็น `role="menuitemcheckbox"` + `aria-checked` ค่าเริ่มจาก `props.preference` → `useOptimistic` →
  `updatePlaybackPreference({ autoplayNext })` / `({ autoSkip })`
- เปลี่ยนแล้วมีผลทันทีกับตอนที่กำลังดู (เปิด Auto Skip ระหว่างอยู่ในช่วง intro → ข้ามที่ tick ถัดไป)
- เพราะ `<Lmp>` ไม่ remount ต้องให้ค่า optimistic อ่านจาก props ใหม่ทุกครั้งที่ page render (ไม่ copy เข้า
  state ครั้งเดียวตอน mount)

### 6.11 Top bar

ตาม `docs/design/00-Overview.png`

- ซ้าย: ปุ่ม Back + ชื่อ `EP${pad2(episodeNo)} • ${content.title}` (~20–24 px) ถ้า content มีมากกว่า 1 season
  → `S${seasonNo} EP${pad2(episodeNo)} • ${content.title}` (special → `SP EP01`, movie → `Movie`; ดู
  `episodeLabel`)
- ขวา: ปุ่ม Playlist (§6.12)
- Back = `<Link href={backHref}>` (§3.7: หน้า season/content ของเรื่อง ตอนนี้ไป `/browse`) ถ้าอยู่ใน
  fullscreen ให้ `exitFullscreen()` ก่อนนำทาง
- gradient ดำจางด้านบน ซ่อน/แสดงพร้อม control bar (§10.1)

### 6.12 Playlist panel

เป็นที่เดียวที่แสดงรายการตอน (ไม่มีรายการใต้ player) มี 2 รูปแบบตามขนาดจอ (แก้ไข 2026-10-16) แยกด้วย
media query `(min-width: 64rem)` = breakpoint `lg` ของ Tailwind (`useMedia` จาก react-use ใน
`playlist-panel.tsx`; class layout ของ panel ใน `lmp.tsx` / `lmp-session.tsx` ใช้ `max-lg:` ให้ตรงกัน)

**Desktop (`lg` ขึ้นไป) → `DrawerComponent`** (`src/components/ui/drawer`, ตัวเดียวกับ filter ของหน้า browse)

```
                                   ┌────────────────────────────────┐
                                   │ ☰▷ PLAYLIST                    │  ← ContentHeader: ไอคอน + ชื่อ content
     (player เบลออยู่ด้านหลัง        │    Content title               │
      backdrop ของ Drawer)          │ ────────────────────────────── │
                                   │ [Season 1 ▾]                   │  ← เมื่อมี > 1 season
                                   │ ┌──────┐ ▣ EP 01               │  ← ตอนที่เล่นอยู่: play mark สี theme
                                   │ │thumb │ Content title         │
                                   │ └──────┘ ∿ JP TH               │
                                   │ ┌──────┐ EP 02 …               │
                                   │ ────────────────────────────── │
                                   │ [CLOSE]                        │  ← ContentFooter
                                   └────────────────────────────────┘
```

- เลื่อนเข้าจากขวา กว้าง `sm:w-120` สูงเต็มจอ, portal เข้า container ของ player (`UNSAFE_PortalProvider` ใน
  `lmp.tsx`) จึงแสดงได้ตอน fullscreen
- เป็น **modal**: คลิกข้างนอกไม่ปิด (`isDismissable={false}`) ปิดด้วยปุ่ม Close, ปุ่ม Playlist / `Escape`
  (session ปิดให้ เพราะ Drawer ตั้ง `isKeyboardDismissDisabled`) ระหว่างเปิดกด controls ของ player ด้วยเมาส์ไม่ได้
  แต่ปุ่มลัดยังทำงาน (อ่านที่ `window` ก่อน) focus ถูกกักใน drawer และคืนให้ปุ่ม Playlist ตอนปิด

**มือถือ (เล็กกว่า `lg`) → panel เดิมใน player** (`docs/design/02-Playlist.png`)

```
                                          ┌──────────────────────────────┐
                                          │ ☰▷  Playlist      [Season 1▾]│  ← ปุ่มเลือก season เมื่อมี > 1
      (วิดีโอ + controls ยังอยู่ที่เดิม        │ ──────────────────────────── │
       panel ซ้อนทับด้านขวา)                │ ┌──────┐ ▣ EP 01             │  ← การ์ดเดียวกับ desktop
                                          │ │thumb │ Content title       │
                                          │ └──────┘ ∿ JP TH             │
                                          └──────────────────────────────┘
```

- เปิด/ปิดด้วยปุ่ม Playlist มุมขวาบน, ปิดด้วย `Escape` หรือปุ่มเดิม (ไม่ปิดเมื่อคลิกวิดีโอ)
- **แนวนอน: ซ้อนทับ**ด้านขวาของ player: กว้าง `clamp(320px, 25%, 480px)`, สูงเต็ม player, พื้นทึบเข้ม,
  เลื่อนเข้าจากขวา 200 ms (`prefers-reduced-motion` → ไม่เลื่อน) อยู่เหนือ control bar ตามดีไซน์
  (ปุ่มกลางไม่ขยับ, ส่วนขวาของ progress / ปุ่มขวาถูกบัง) ระหว่างเปิดไม่ auto-hide controls
- **แนวตั้ง** (player เตี้ย ~210 px ใส่ panel ไม่ได้): panel ตัวเดียวกันวางต่อใต้ player แทนการซ้อนทับ
- หัว: ปุ่ม Playlist (ปิด) + "Playlist" + เส้นคั่น + ปุ่มเลือก season เมื่อมี > 1
- ไม่ใช่ modal: `<nav aria-labelledby>` + `<ol>` ปุ่มลัดยังทำงาน

**ร่วมกันทั้งสองแบบ**

- ถ้า content มี > 1 season มี HeroUI `Select` เลือก season ค่าเริ่มต้น = season ที่กำลังเล่น
  (ตามไปเมื่อเล่นข้าม season)
- การ์ด (`playlist-item.tsx`) **ใช้ดีไซน์เดียวกับการ์ดตอนของหน้า content** (`docs/design/content-page.png`)
  ผ่าน `EpisodeCardBody` ใน `src/components/episode-card.tsx` (ใช้ร่วมกับ
  `content/[seasonId]/components/episode-card.tsx`):
  - ซ้าย: thumbnail 16:9 กว้าง `w-28` (`/api/art/thumbnail/<episodeId>`, `sizes="112px"`) ไม่มีรูป
    (`hasThumbnail = false`) = กรอบเทา
  - ขวา: `EP 01` ตัวหนา (season แบบ movie → `Movie`) ตอนที่เล่นอยู่มี `PlaySquareIcon` สี theme นำหน้า
    (อ่านว่า "Now playing"), ชื่อ = ชื่อ season หรือชื่อ content (เหมือนหน้า content), แถวเสียง
    `AudioWave01Icon` + รหัสภาษา (`JP TH`) และ `sr-only` "Audio: Japanese, Thai dub"
  - ตอนที่ไม่มีภาษาที่กำลังฟังมีหมายเหตุท้ายแถวเสียง เช่น "No ไทย audio" (เปิดด้วยภาษาอื่นตาม §3.4)
  - ไม่มี track → "No audio yet", `aria-disabled` (ยัง focus ได้) จาง 40%
  - ไม่แสดงเรื่องย่อแล้ว (ข้อมูล playlist จึงไม่ส่ง `synopsis`; ส่ง `hasThumbnail` + `audios` แทน `languages`)
- คลิกการ์ด → `/watch?vid=<episodeId>&audio=<ภาษาที่กำลังฟัง>` (§6.8; ตอนที่ไม่มีภาษานั้น server เลือกตาม
  §3.4) playlist ยังเปิดอยู่ (อยู่ใน `lmp.tsx` + `playlistOpen` ใน store)
- เปิดแล้ว `scrollIntoView({ block: "nearest" })` การ์ดตอนปัจจุบัน
- การ์ดเป็นปุ่ม native ที่ focus ได้ (Space บนการ์ดถูกกันตาม §7.3 ใช้ Enter เลือก)

#### 6.12.1 ผลการทำเฟส 7.5 (✅ เสร็จ 2026-10-13)

ไฟล์: `playlist/playlist-panel.tsx`, `playlist/playlist-item.tsx`, `controls/playlist-button.tsx` (ใหม่),
`lmp.tsx`, `lmp-session.tsx`, `controls/top-bar.tsx`, `controls/control-button.tsx` (prop `panel`), `utils.ts`
(`seasonName`, export `pad2`), `src/styles/theme.css` (`animate-slide-in-right`)

ต่างจากแผนด้านบน

- **Layout**: `PlayerFrame` (container ที่เข้า fullscreen) เป็น `flex portrait:flex-col` มี `<div>` ห่อ
  `<video>` + `<LmpSession>` (overlay ทั้งหมดอิงกล่องนี้) แล้วตามด้วย panel → panel อยู่ใน container
  จึงใช้ได้ใน fullscreen แนวตั้งใช้ media `portrait` (ทุกจอแนวตั้ง ไม่เฉพาะมือถือ): เปิด panel
  แล้วกล่องวิดีโอเป็น `aspect-video` ด้านบน panel กินที่เหลือ `<video>` ยังเป็น element เดิม (เปลี่ยนแค่ class
  ของกล่อง)
- panel **mount เฉพาะตอนเปิด** (ปิดแล้ว unmount, ไม่มี animation ตอนปิด) → เปิดใหม่เริ่มที่ season
  ของตอนที่เล่น ระหว่างเปิด ถ้าตอนที่เล่นย้าย season (Next / Shift+P ข้าม season) ตัวเลือก season ตามไปเอง
- เลือกตอน: panel อยู่ใน `<Lmp>` แต่ `goTo` เป็นของ session → session ฝาก `actions` ไว้ใน `actionsRef` ของ
  `<Lmp>` (บันทึก progress + ส่งต่อสถานะเล่นเหมือนปุ่ม Next)
- ปุ่ม Playlist มี 2 ที่: top bar และ**ไอคอนในหัว panel** (ทำหน้าที่ปิด, ตรงดีไซน์ที่ panel บังปุ่มบน top bar)
  ปิดตอน focus อยู่ใน panel → ย้าย focus ไปปุ่มบน top bar (`releasePlaylistFocus`)
- `Escape` จัดการใน session: ทำงานเฉพาะเมื่อไม่มี popover / หน้าต่างปุ่มลัดเปิดอยู่ → กด Esc ปิดทีละชั้น
- ตัวเลือก season เป็น `<select>` native (`seasonName`: `Season 2`, ไม่มีเลขใช้ title หรือ `Specials` /
  `Movie` / `Spinoff`)
- ป้ายตอนที่ไม่มีเสียงที่ฟังอยู่: `No ไทย audio` (ชื่อภาษาแบบ endonym) แทน "Original only" เพราะตอนนั้นอาจมี
  ภาษาอื่นด้วย
- ระหว่างเปิด panel ในแนวนอน ปุ่มกลุ่มขวา (PiP / Fullscreen / Preferences) ถูกบังตามดีไซน์ ใช้ปุ่มลัดได้

ผลทดสอบ (headless Chrome 155, Sono Bisque Doll 2 season × 12 ตอน)

- 1280×720: panel 320 px ขวา (`clamp` → 25%), ตอนปัจจุบัน `▷ EP 01` สี theme และอยู่ในมุมมอง
- เลือก EP3 → URL เปลี่ยน, `<video>` ตัวเดิม, ยังเล่นต่อ, panel ยังเปิด, current = EP3
- สลับเป็น Season 2 → list ขึ้นบนสุด; เลือก S2 EP1 แล้ว Shift+P → S1 EP12: ตัวเลือก season กลับเป็น Season 1
  และเลื่อน EP12 เข้ามุมมอง
- Esc ปิดทีละชั้น: Audio Tracks → panel; Shift+/ → หน้าต่างปุ่มลัด → panel
- Space ตอน focus การ์ด → play/pause อย่างเดียว ไม่เปลี่ยนตอน; Esc ตอน focus ใน panel → focus ไปปุ่ม Playlist
- Shift+F ตอนเปิด panel → panel อยู่ใน fullscreen
- 390×844 แนวตั้ง: player 390×219 ด้านบน, panel 390×625 ด้านล่าง / 844×390 แนวนอน: ซ้อนทับขวา 320 px
- ไม่มี error ใน console, `bun run build` ผ่าน
- **ยังไม่ได้ทดสอบ**: การ์ด disabled (ตอนไม่มี track) และป้าย `No … audio` เพราะข้อมูลตอนนี้ทุกตอนมีทั้ง
  ต้นฉบับและพากย์ไทย, มือถือจริง (ทัช), PiP + เลือกตอน
- ข้อสังเกตข้อมูล: `episodes.title` ของชุดนี้เป็น `"01"`, `"02"` … และไม่มี `synopsis` การ์ดจึงแสดง `01`
  เป็นชื่อตอนและไม่มีเรื่องย่อ

---

## 7. Shortcuts (ปุ่มลัด)

### 7.1 ตารางปุ่มลัด (`lmp/hotkeys.ts`)

| ปุ่ม        | ตรวจด้วย                                             | Action                 | กดค้าง (`repeat`)          | `preventDefault`                            |
| ----------- | ---------------------------------------------------- | ---------------------- | -------------------------- | ------------------------------------------- |
| `Space`     | `code === "Space"` ไม่มี Shift                       | `togglePlay()`         | ไม่สนใจ                    | ✔ (keydown + keyup)                         |
| `Shift + S` | `code === "KeyS"` + `shiftKey`                       | `stop()`               | ไม่สนใจ                    | ✔                                           |
| `Shift + M` | `code === "KeyM"` + `shiftKey`                       | `toggleMute()`         | ไม่สนใจ                    | ✔                                           |
| `↑`         | `code === "ArrowUp"` ไม่มี Shift                     | `setVolume(+0.05)`     | ทำซ้ำได้                   | ✔                                           |
| `↓`         | `code === "ArrowDown"` ไม่มี Shift                   | `setVolume(−0.05)`     | ทำซ้ำได้                   | ✔                                           |
| `←`         | `code === "ArrowLeft"` ไม่มี Shift                   | `seekBy(−10)`          | ทำซ้ำได้ (throttle 150 ms) | ✔                                           |
| `→`         | `code === "ArrowRight"` ไม่มี Shift                  | `seekBy(+10)`          | ทำซ้ำได้ (throttle 150 ms) | ✔                                           |
| `Shift + P` | `code === "KeyP"` + `shiftKey`                       | `goTo(prev)`           | ไม่สนใจ                    | ✔                                           |
| `Shift + N` | `code === "KeyN"` + `shiftKey`                       | `goTo(next)`           | ไม่สนใจ                    | ✔                                           |
| `Shift + F` | `code === "KeyF"` + `shiftKey`                       | `toggleFullscreen()`   | ไม่สนใจ                    | ✔                                           |
| `Shift + I` | `code === "KeyI"` + `shiftKey`                       | `togglePip()`          | ไม่สนใจ                    | ✔                                           |
| `Shift + /` | `code === "Slash"` + `shiftKey`                      | `toggleShortcutHelp()` | ไม่สนใจ                    | ✔                                           |
| `Escape`    | `code === "Escape"` เฉพาะตอนเมนู/หน้าต่างปุ่มลัดเปิด | ปิดตัวที่เปิดอยู่      | —                          | ✘ (ให้เบราว์เซอร์ออก fullscreen ได้ตามปกติ) |

- ตารางนี้เป็น **แหล่งเดียว** (`HOTKEYS` ใน `lmp/hotkeys.ts`: `{ code, shift, repeat, action, label, keys }`)
  ทั้ง `use-lmp-hotkeys` และ `shortcut-help.tsx` อ่านจากที่เดียวกัน เพิ่ม/แก้ปุ่มที่เดียวจบ
- ทุกปุ่มมี OSD feedback (ภาษาอังกฤษ): "Play", "Pause", "Stopped", "Muted", "Volume 55%", "+10 s",
  "Fullscreen", "No next episode", "Picture-in-picture isn't supported in this browser" ฯลฯ

### 7.2 กติกาการดักปุ่ม (`use-lmp-hotkeys`)

```ts
window.addEventListener("keydown", onKeyDown, { capture: true })
window.addEventListener("keyup", onKeyUp, { capture: true })
```

1. **ฟังที่ `window` ใน capture phase** → ทำงานได้ไม่ว่า focus อยู่ที่ไหนในหน้า และได้ event ก่อน element ที่
   focus อยู่
2. **ใช้ `event.code` ไม่ใช้ `event.key`** — สำคัญสำหรับผู้ใช้ไทย:
   - แป้นไทย (เกษมณี) `Shift + S` ได้ `key = "ฆ"` ถ้าเช็ค `key === "S"` ปุ่มลัดพังทันทีที่สลับภาษา
   - Caps Lock เปิดอยู่ กด `S` เฉย ๆ ได้ `key = "S"` → ใช้ `code` + `shiftKey` ตัดปัญหา
3. **ข้ามเมื่อมี `ctrlKey` / `altKey` / `metaKey`** → ไม่แย่ง `Ctrl+Shift+I` (DevTools), `Ctrl+Shift+N`
   (Incognito), `Ctrl+Shift+P` (Private window), `Alt+←` (Back), `Cmd+Shift+F` (macOS) และ `AltGr` (=
   Ctrl+Alt)
4. **Shift ต้องตรงเป๊ะ**: ปุ่มตัวอักษร/Slash ต้องมี Shift, Space/ลูกศรต้องไม่มี Shift
5. **ข้าม IME**: `event.isComposing || event.keyCode === 229`
6. **`event.repeat`**: ปุ่ม toggle ไม่สนใจ repeat ลูกศรรับได้
7. **ข้ามเมื่อ `event.defaultPrevented`**
8. ไม่มี guard สำหรับ input (หน้า watch ไม่มี input)
9. ลงทะเบียน listener ครั้งเดียวต่อ session เก็บ actions ล่าสุดใน ref (`actionsRef.current = actions`) ไม่ต้อง
   remove/add ทุก render (ไม่มี React Compiler) ถอดตอน session unmount (session ใหม่ลงทะเบียนต่อทันที)

### 7.3 ปัญหา `Space` กับปุ่มที่ focus อยู่

คลิกปุ่ม (เช่น Preferences) แล้วปุ่มนั้นได้ focus → กด Space → เบราว์เซอร์ "คลิก" ปุ่มนั้นตอน **keyup** → สลับ
play/pause และกดปุ่ม พร้อมกัน วิธีแก้: `preventDefault()` ทั้ง **keydown และ keyup** ของ Space (การยกเลิกแค่
keydown ไม่พอใน Firefox) ปุ่มที่ focus ยังกดด้วย `Enter` ได้

### 7.4 การกดลูกศรค้าง

- Volume: แต่ละ repeat = ±5% ทันที
- Seek: แต่ละ repeat บวก/ลบ `pendingSeekRef` ทันที (OSD + progress bar แสดงเวลาเป้าหมาย) แต่สั่ง
  `video.currentTime` จริงผ่าน `throttle(150 ms, trailing)` ไม่ให้ MSE abort/fetch ใหม่ 30 ครั้งต่อวินาที
- เมนูเปิดอยู่ ลูกศรยังเป็นปุ่มลัด เมนูใช้ Tab / Shift+Tab / Enter

### 7.5 ผลข้างเคียงที่ยอมรับ

- ลูกศรขึ้น/ลงและ Space เลื่อนหน้าไม่ได้ในหน้า watch ซึ่งปกติไม่มีอะไรให้เลื่อนอยู่แล้ว (player เต็ม viewport)
  ยกเว้นมือถือแนวตั้งที่ Playlist อยู่ใต้ player (เลื่อนด้วยนิ้ว) และรายการใน Playlist panel
  (เลื่อนด้วยล้อเมาส์ / ทัชแพด)

### 7.6 ปุ่มลัดชนกับเบราว์เซอร์ไหม?

**ไม่มีปุ่มใดชนกับ shortcut ของ Chrome / Edge / Firefox / Safari แบบที่ override ไม่ได้** เพราะ shortcut
ตัวอักษรของ เบราว์เซอร์ต้องมี Ctrl/Alt/Cmd ร่วมด้วยเสมอ ส่วน `Shift + ตัวอักษร` เฉย ๆ ไม่มีความหมายพิเศษ

| ปุ่มของเรา  | ค่า default ของเบราว์เซอร์                                                 | Override ได้ | หมายเหตุ                              |
| ----------- | -------------------------------------------------------------------------- | ------------ | ------------------------------------- |
| `Space`     | เลื่อนหน้าลง / คลิกปุ่มที่ focus                                           | ✔            | preventDefault keydown + keyup (§7.3) |
| `Shift + S` | ไม่มี (Ctrl+Shift+S = screenshot ของ Firefox ข้ามเพราะมี Ctrl)             | ✔            |                                       |
| `Shift + M` | ไม่มี (Ctrl+Shift+M = สลับ profile ใน Chrome / Responsive mode ใน Firefox) | ✔            |                                       |
| `↑` / `↓`   | เลื่อนหน้า                                                                 | ✔            | ผลข้างเคียง §7.5                      |
| `←` / `→`   | เลื่อนแนวนอน (Alt+←/→ = Back/Forward ข้ามเพราะมี Alt)                      | ✔            |                                       |
| `Shift + P` | ไม่มี (Ctrl+Shift+P = Private/InPrivate window)                            | ✔            |                                       |
| `Shift + N` | ไม่มี (Ctrl+Shift+N = Incognito)                                           | ✔            |                                       |
| `Shift + F` | ไม่มี                                                                      | ✔            |                                       |
| `Shift + I` | ไม่มี (Ctrl+Shift+I = DevTools)                                            | ✔            |                                       |
| `Shift + /` | ไม่มี (Quick Find ของ Firefox คือ `/` และ `'` แบบไม่กด Shift)              | ✔            |                                       |

**ข้อจำกัดของแพลตฟอร์มที่บังคับไม่ได้**

1. **Focus อยู่นอกหน้าเว็บ** — address bar, bookmark bar, DevTools, หน้าต่างอื่น หรือ**หน้าต่าง PiP**
   เบราว์เซอร์ไม่ส่ง keydown มาที่หน้า ต่อให้แท็บ active ก็ตาม ต้องคลิกหน้าเว็บก่อนหนึ่งครั้ง (ปุ่ม media ⏯ ⏭
   ⏮ บนคีย์บอร์ด/หูฟังยังใช้ได้ผ่าน Media Session §11)
2. **`Shift + I` บน Firefox ใช้ไม่ได้** — Firefox ไม่มี `requestPictureInPicture()` ให้เว็บเรียก (มีแต่ปุ่ม
   PiP ของตัวเอง และ `Ctrl+Shift+]`) → OSD "Picture-in-picture isn't supported in this browser" + ซ่อนปุ่ม
   PiP + แถวนี้ในหน้าต่างปุ่มลัดเป็นสีจาง
3. **`Esc` ตอน fullscreen** — เบราว์เซอร์สงวนไว้ออกจาก fullscreen เสมอ ถ้าเปิดหน้าต่างปุ่มลัดอยู่ใน fullscreen
   แล้วกด Esc จะทั้งปิดหน้าต่างและออก fullscreen พร้อมกัน (ห้ามไม่ได้) `F11` เป็น fullscreen ของเบราว์เซอร์
   แยกจาก `Shift+F`
4. **iPhone** — ไม่มี Element Fullscreen กับ div → ใช้ `video.webkitEnterFullscreen()` ซึ่งเป็น native player
   (controls และปุ่มลัดของเราหายระหว่างนั้น) iPad ใช้ `webkitRequestFullscreen` กับ container ได้
5. **Screen reader** (NVDA/JAWS browse mode) กินปุ่มตัวอักษรและลูกศรก่อนถึงหน้าเว็บ
6. **Windows Sticky Keys** — กด Shift 5 ครั้งติดกันเด้งหน้าต่าง Sticky Keys (ระดับ OS)

### 7.7 Fullscreen กับ PiP จาก keydown

- `requestFullscreen()` / `requestPictureInPicture()` ต้องมี user gesture → keydown นับเป็น transient
  activation เรียกตรง ๆ ใน handler **ห้าม `await` อย่างอื่นก่อน**
- fullscreen อยู่แล้วกด `Shift+I` → `exitFullscreen()` แล้ว `requestPictureInPicture()` (activation ยังอยู่ ~5
  วินาทีใน Chromium)
- PiP อยู่แล้วกด `Shift+F` → `exitPictureInPicture()` แล้ว `requestFullscreen()`

### 7.8 หน้าต่างรายการปุ่มลัด (`shortcut-help.tsx`)

- เปิด: `Shift + /` หรือ Preferences → "Keyboard shortcuts" (§6.10) ปิด: `Shift + /` อีกครั้ง, `Escape`, ปุ่ม
  ✕ (`Modal.CloseTrigger`), คลิกนอกแผง
- เป็น HeroUI `Modal` (backdrop โปร่งใส) ที่ portal เข้า container ของ player จึงแสดงได้ตอน fullscreen ไม่ pause
  วิดีโอ ปุ่มลัดอื่นยังทำงานตอนเปิด
- เนื้อหา render จาก `HOTKEYS` เป็นตาราง 2 คอลัมน์: ปุ่ม (`<kbd>`) | การทำงาน แถวที่เบราว์เซอร์ไม่รองรับ (PiP
  บน Firefox) เป็นสีจางพร้อมหมายเหตุ
- `role="dialog"` + `aria-modal="false"` + `aria-labelledby` ย้าย focus ไปที่ปุ่ม ✕ ตอนเปิด และคืน focus
  ตอนปิด
- จอแคบ: แผงเต็มความกว้างของ player เลื่อนในแผงได้

---

## 8. Skip, Autoplay Next และ PiP ข้ามตอน

### 8.1 Skip button (Auto Skip ปิด)

- `use-skips` หา `range = skips.find((skip) => skip.from <= t && t < skip.to)` ทุก `timeupdate`
- ปุ่มมุมขวาล่าง เหนือแถวเวลา (ตาม 00-Overview): กล่องพื้น `bg-black/60` + `backdrop-blur` ตัวขาว ~20 px
  มุมโค้งเล็ก
  - `intro` → "Skip intro", `recap` → "Skip recap" → `seekTo(range.to)`
  - `outro` → มี `next` → "Next episode" (`goTo(next)`), ไม่มี (รวมกรณีตอนถัดไปไม่มีภาษานี้) → "Skip credits"
    (`seekTo(range.to)`)
- แสดงตลอดช่วงแม้ controls ซ่อน จาง/เล็กลงหลัง 5 วินาทีถ้าไม่มี interaction ไม่ auto-focus

### 8.2 Auto Skip (เปิด)

**ข้ามเฉพาะเมื่อ "เล่นเข้า" ช่วงนั้นเอง ไม่ข้ามเมื่อผู้ใช้ seek เข้าไปเอง**

```
ทุก timeupdate:
  range = ช่วงที่ t อยู่ (ถ้ามี)
  entered = range && (prevTickTime < range.from || isInitialStart) && !lastActionWasUserSeek
  ถ้า entered และ range ไม่อยู่ใน declinedRef:
     intro / recap  → seekTo(range.to) + OSD "Intro skipped · [Undo]" 5 วิ
     outro          → ตาราง 8.4
  ผู้ใช้ seek เข้ามาในช่วงเอง → ไม่ข้าม แสดงปุ่มแบบ 8.1
```

- `isInitialStart`: `startAt` อยู่ในช่วง intro (เช่น intro 0–90 วิ เริ่มที่ 0) → ข้ามเลย
- **Undo**: "Undo" → `seekTo(range.from)` + ใส่ range ลง `declinedRef` (ไม่ข้ามอีกใน session นี้)
- `seeking` ที่ไม่ได้มาจาก auto skip → `lastActionWasUserSeek = true` ล้างเมื่อ tick ถัดไปออกนอกช่วง

### 8.3 Autoplay Next (countdown)

- `ended` + `autoplayNext` เปิด + มี `next`:
  - การ์ด `next-countdown`: thumbnail ตอนถัดไป (`/api/art/thumbnail/<next.episodeId>` ผ่าน `next/image`), "Up
    next · S2 · EP01 Episode title", วงแหวนนับถอยหลัง **5 วินาที**, ปุ่ม "Play now" / "Cancel"
  - นับด้วย deadline: `deadline = Date.now() + 5000` ตั้ง `setTimeout(goNext, deadline − Date.now())` ตัวเดียว
    ส่วนตัวเลขบน วงแหวนอัปเดตด้วย rAF (หยุดเองตอนแท็บซ่อน แต่ timeout ยังทำงาน) ไม่ใช้ `setInterval` นับครั้ง
  - ยกเลิก / Stop / seek ย้อน / Play (รีเพลย์) → ยกเลิก countdown
  - `handoffRef.current.playing = true` แล้ว `goTo(next)`
- `autoplayNext` ปิด หรือไม่มี `next` → การ์ด "Up next" แบบไม่นับ (มี next) หรือปุ่ม "Replay"
- **ไม่มี `next` แต่มี `nextFallback`** (ตอนถัดไปมีอยู่แต่ไม่มีภาษาที่ฟังอยู่ เช่น ดูพากย์ไทย EP6 จบ แต่ EP7
  มีแค่ต้นฉบับ): **หยุดและถาม ไม่นับถอยหลัง ไม่ว่า Autoplay Next จะเปิดอยู่หรือไม่**
  - การ์ด: thumbnail EP7 + "EP07 isn't available in ไทย yet" (ชื่อภาษาเป็น endonym) + ปุ่ม "Watch in Original
    (日本語)" (`goTo(nextFallback)`) และ "Replay"
  - ปุ่ม Next / Shift+N / Media Session `nexttrack` ถือว่าไม่มีตอนถัดไป (disabled / OSD "No next episode") —
    เปลี่ยนภาษาได้จากการ์ดนี้, Audio Tracks หรือ Playlist เท่านั้น
- **ระหว่าง PiP / แท็บซ่อน**: การ์ดไม่มีใครเห็น แต่ countdown ยังเดินและเปลี่ยนตอนให้ PiP
  เล่นตอนถัดไปต่อในหน้าต่างเดิม (§8.5) และ Media Session อัปเดตชื่อตอนใหม่ ข้อควรรู้: แท็บที่ซ่อนนานเกิน 5
  นาทีแล้วเสียงเงียบ (ตอนจบ) Chrome อาจหน่วง timer ได้ถึง ~1 นาที (intensive throttling)
  ถ้าเจอจริงค่อยย้ายไปเริ่ม countdown ตอนเริ่ม outro แทน

### 8.4 ตารางพฤติกรรมเมื่อถึงช่วง outro / จบตอน

| Auto Skip | Autoplay Next | มี next                         | ถึง `outro.from`                                         | `ended`                               |
| --------- | ------------- | ------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| ปิด       | ปิด           | มี                              | ปุ่ม "Next episode"                                      | การ์ด "Up next" (ไม่นับ)              |
| ปิด       | เปิด          | มี                              | ปุ่ม "Next episode"                                      | countdown 5 วิ → ตอนถัดไป             |
| เปิด      | ปิด           | มี                              | ข้ามไป `outro.to` (OSD + undo)                           | การ์ด "Up next" (ไม่นับ)              |
| เปิด      | เปิด          | มี                              | **ไปตอนถัดไปทันที** (ข้ามเครดิต) + บันทึก progress ว่าจบ | —                                     |
| ใดก็ได้   | ใดก็ได้       | ไม่มี                           | ปิด → ปุ่ม "Skip credits" / เปิด → ข้ามไป `outro.to`     | ปุ่ม "Replay"                         |
| ใดก็ได้   | ใดก็ได้       | ไม่มีในภาษานี้ (`nextFallback`) | ปิด → ปุ่ม "Skip credits" / เปิด → ข้ามไป `outro.to`     | การ์ดถาม "Watch in Original" (ไม่นับ) |

> `outro.to ≥ duration − 1` → "ข้ามไป outro.to" = จบตอนเลย → เข้าคอลัมน์ `ended`

### 8.6 ผลการทำเฟส 8 (✅ เสร็จ 2026-10-14)

ไฟล์: `hooks/use-skips.ts`, `hooks/use-autoplay-next.ts`, `overlays/skip-button.tsx`,
`overlays/skip-notice.tsx`, `overlays/end-card.tsx` (ใหม่), `lmp-session.tsx`, `types.ts` + `watch/utils.ts`
(`LmpAdjacent.isDubbed`), `playlist/playlist-panel.tsx`, `lmp.tsx`, `hooks/use-media-source.ts` (แก้บั๊ก
ดูด้านล่าง)

ต่างจากแผนด้านบน

- การ์ดจบตอนอยู่ใน `overlays/end-card.tsx` (component `EndCard`) แทน `next-countdown.tsx` เพราะรวมทั้ง 3 แบบ:
  "Up next" (นับ / ไม่นับ), การ์ดถาม "Watch in Original" และปุ่ม Replay กลางจอ (ไม่มีตอนถัดไป)
- `LmpAdjacent` มี `isDubbed` เพิ่ม → ปุ่มบนการ์ดเขียนชื่อเสียงถูก: `Watch in Original (日本語)` หรือ
  `Watch in ไทย` ถ้า `nextFallback` เป็นพากย์ตาม preference
- Cancel บน countdown → การ์ดยังอยู่แต่ไม่นับ (Play now / Replay) จบตอนครั้งถัดไปนับใหม่
- ป้าย Auto Skip: `Intro skipped · Undo` / `Recap skipped` / `Credits skipped` มุมซ้ายล่าง 5 วิ
- ปุ่ม Skip / การ์ด / ป้าย อยู่ในกล่องเดียวกัน: ยกขึ้นเหนือ control bar ตอน controls แสดง ลงมาชิดล่างตอนซ่อน
  และหลบ Playlist panel ในแนวนอน
- เปิด Auto Skip ระหว่างอยู่ในช่วง → ข้ามที่ tick ถัดไป (ตาม §6.10) ตอนเริ่ม session ในช่วง (เช่น resume กลาง
  intro) ก็นับว่า "เล่นเข้า" ช่วงนั้น
- **บั๊กที่เจอและแก้ใน `use-media-source`**: track พากย์ไทย S1 ยาว 1450 วิ แต่ภาพจบที่ ~1430 วิ (fragment ท้าย
  ๆ มีแต่เสียง) `video.buffered` เป็น intersection ของทุก track จึงไม่เคยแสดงช่วงนั้น → `tick()` โหลด fragment
  เดิม วนไม่รู้จบ, ไม่ถึง `endOfStream()`, ค้างที่ `readyState 1` และไม่เกิด `ended` (Autoplay Next
  ใช้ไม่ได้กับพากย์ ไทย S1 ทุกตอน) แก้ด้วย set `unbuffered`: fragment ที่ append แล้วแต่ไม่โผล่ใน `buffered`
  นับว่ามีแล้ว (ล้างเมื่อ remove ช่วงนั้นเอง) → ถึง `endOfStream()` แล้วเบราว์เซอร์ขยาย range ให้ เล่นจนจบได้
  (ทดสอบ: 6 request, buffered 1420–1450.4, `ended` ✓)

ผลทดสอบ (headless Chrome 155, ใส่ skips ชั่วคราวใน S1E1 / S1E2 / S2E12 + เปลี่ยนภาษา track ไทยของ S1E2 เป็น
`ko-KR` ชั่วคราวเพื่อทดสอบ `nextFallback` แล้วคืนค่าทั้งหมด)

| ตาราง §8.4                       | ผล                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| ปิด / ปิด / มี next              | ✓ "Skip intro" → 95 วิ, outro → "Next episode", จบ → "Up next" ไม่นับ                                               |
| ปิด / เปิด / มี next             | ✓ นับ 5 วิ → S1E2 เล่นต่อ `<video>` เดิม; Cancel แล้วไม่ไป, จบอีกครั้งนับใหม่                                       |
| เปิด / ปิด / มี next             | ✓ recap 0–30 ข้ามตอนเริ่ม, intro ข้าม + Undo กลับ 60 และไม่ข้ามซ้ำ, credits ข้ามไป 1390                             |
| เปิด / เปิด / มี next            | ✓ เข้า outro 1300 → S1E3 ทันที                                                                                      |
| ไม่มี next (S2E12)               | ✓ "Skip credits", จบ → ปุ่ม Replay อย่างเดียว                                                                       |
| ไม่มีในภาษานี้ (ไทย S1E1 → S1E2) | ✓ การ์ด "S1 EP02 isn't available in ไทย yet" ไม่นับแม้ Autoplay เปิด → Watch in Original (日本語) เล่น S1E2 ต้นฉบับ |

- seek เข้าช่วง intro เอง → ไม่ข้าม แสดงปุ่ม ✓
- ยังไม่ได้ทดสอบ: Autoplay Next ระหว่าง PiP / แท็บซ่อน, มือถือจริง
- ข้อสังเกตที่ตัดสินแล้ว (2026-10-14, §0.2): `skips` ใช้ร่วมทุกภาษาต่อไป; `?t=` ของ URL ชนะตำแหน่งที่จำไว้ใน
  `sessionStorage` / handoff แล้ว (`use-lmp-controller` อ่าน `useSearchParams()`)

### 8.5 PiP (และ fullscreen) ค้างอยู่ข้ามตอน

**ปัญหาเดิม**: แผนรอบแรกใช้ `<Player key={track.id}>` ทำให้ `<video>` ถูกทำลายทุกครั้งที่เปลี่ยนตอน
และเบราว์เซอร์ปิด PiP เสมอ เมื่อ video element ที่อยู่ใน PiP ถูกถอดออกจาก DOM

**ทางเลือกที่พิจารณา**

| วิธี                                                                           | ผล                                                                                                                                                                         | เลือก                                           |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **ใช้ `<video>` ตัวเดิมตลอด** ถอด MediaSource เก่า ต่อตัวใหม่เข้า element เดิม | PiP ค้างอยู่ได้ทุกเบราว์เซอร์ที่มี PiP (วิธีเดียวกับ YouTube ตอน autoplay ใน PiP) fullscreen ก็ค้างด้วยเพราะ container เดิม autoplay ผ่านง่ายขึ้นเพราะ element เคยเล่นแล้ว | ✔                                               |
| จำว่าเปิด PiP ไว้ แล้ว `requestPictureInPicture()` ใหม่หลัง remount            | ต้องมี user gesture ภายใน ~5 วิ ใช้ได้เฉพาะตอนกด Next เอง Autoplay Next ที่ไม่มีการกด → เบราว์เซอร์ปฏิเสธ และหน้าต่างกระพริบ (ปิดแล้วเปิด)                                 | ✘                                               |
| Document Picture-in-Picture (ย้าย UI ทั้งก้อนไปหน้าต่าง PiP)                   | ได้ controls + การ์ดตอนถัดไปใน PiP แต่มีเฉพาะ Chrome/Edge                                                                                                                  | ✘ (อาจเป็นส่วนเสริมภายหลัง บนพื้นฐานของวิธีแรก) |

**วิธีทำ**

1. `<Lmp>` ไม่มี `key` และเป็นเจ้าของ `<video>` + container (§4.1) ส่วน `<LmpSession key={track.id}>`
   เป็นเจ้าของ state ต่อตอน
2. session cleanup (เปลี่ยนตอน/ภาษา): abort fetch, ถอด listener ของ `mediaSource`/`sourceBuffer`/`video` ที่
   session ใส่ไว้, `endOfStream()` ถ้า `readyState === "open"`, revoke Object URL ถ้า `sourceopen` ยังไม่มา
   **ไม่** `removeAttribute("src")` + `load()` เพราะ session ใหม่จะตั้ง `video.src = newObjectUrl` ทันที
   (การตั้ง `src` รัน load algorithm อยู่แล้ว)
3. ระหว่างโหลดตอนใหม่ หน้าต่าง PiP จะดำ/ค้างภาพสุดท้ายชั่วครู่ แล้วเล่นตอนใหม่ต่อ
4. `use-media-session` ของ session ใหม่ตั้ง `metadata` เป็นตอนใหม่ → หน้าต่าง PiP / OS แสดงชื่อตอนใหม่ ปุ่ม
   next/prev ใน PiP ชี้ไปตอนถัดไปของตอนใหม่
5. exit PiP **เฉพาะ** ตอน `<Lmp>` unmount (ออกจากหน้า watch) และตอน Stop
6. ต้องทดสอบจริง (เฟส 5): Chrome, Edge, Safari macOS ว่า PiP ไม่ปิดตอน `src` เปลี่ยน ถ้าเบราว์เซอร์ไหนปิด ให้
   fallback เป็น "เปิด PiP ใหม่ถ้ายังมี user activation" สำหรับเบราว์เซอร์นั้น

---

## 9. MSE (`use-media-source`)

ยึดตาม `video-streaming.md` ส่วน "Player: MediaSource + Object URL" ทุกข้อ เพิ่มเติมเฉพาะส่วนของ LMP

### 9.1 API

```ts
const mse = useMediaSource(videoRef, { vid, mimeCodec, duration, initEnd, fragments, startAt })
// mse.seekTo(t)          ตั้ง currentTime + โหลด fragment ที่ถูกต้อง
// mse.stopBuffering()    abort fetch, หยุด buffer loop (Stop)
// mse.resumeBuffering()  เริ่ม loop ใหม่จากตำแหน่งปัจจุบัน
// mse.mode               "mse" | "native"
```

### 9.2 ขั้นตอน

1. `MediaSourceImpl = window.ManagedMediaSource ?? window.MediaSource` → ไม่รองรับ `mimeCodec` → native
   fallback (`video.src = /api/stream/<vid>`)
2. `createObjectURL` → `video.src` (element เดิมจาก parent) → `sourceopen` → `revokeObjectURL` →
   `mediaSource.duration` → `addSourceBuffer(mimeCodec)` + `mode = "segments"`
3. fetch init segment `bytes=0-(initEnd-1)` → append
4. `loadedmetadata` → `video.currentTime = startAt` → seek handler โหลด fragment ที่มี `startAt`
5. **Buffer loop**: `bufferedEnd − currentTime < 30` → fetch fragment ถัดไป (ทีละอัน) → append ผ่านคิว
6. **Evict**: หลัง append ถ้ามีข้อมูลก่อน `currentTime − 30` → `remove(0, currentTime − 30)` ผ่านคิว
   `QuotaExceededError` → evict แล้ว retry
7. **Seek**: `seeking` → abort fetch → `findFragmentIndex(fragments, t)` (binary search) → อยู่ใน `buffered`
   แล้วไม่ต้องโหลด
8. **จบ**: append fragment สุดท้ายเสร็จ → `endOfStream()`
9. **Error**: fetch พลาด retry 2 ครั้ง (500 ms, 1500 ms) ยังพลาด → native fallback จากตำแหน่งปัจจุบัน `401` →
   ไม่ retry แสดง "Your session has expired" + ลิงก์รีเฟรช
10. **Cleanup ของ session**: ตาม §8.5 ข้อ 2 (ไม่ reset element) **Teardown ของ `<Lmp>`**:
    `removeAttribute("src")` + `load()`

### 9.3 Stop กับ MSE

- `stopBuffering()` = abort + `haltedRef = true` (buffer loop เช็คก่อน fetch ทุกครั้ง)
- ไม่ลบ buffer ที่มีอยู่ (ถ้า fragment แรกยังไม่ถูก evict กด Play ก็เล่นได้ทันที)

---

## 10. UX เสริม

### 10.1 Auto-hide controls

- ระหว่าง `playing`: ไม่มีการขยับเมาส์/แตะ/กดปุ่ม 3 วินาที → ซ่อน **top bar และ control bar พร้อมกัน** (fade
  200 ms) + `cursor-none`
- แสดงตลอดเมื่อ: `paused`, `stopped`, `ended`, popover / Playlist panel / หน้าต่างปุ่มลัดเปิด, hover บน top
  bar หรือ control bar, กำลังลาก progress
- ปุ่มลัด seek โชว์ control bar 2 วินาที ปุ่มลัดอื่นโชว์แค่ OSD
- gradient ดำจางด้านบนและด้านล่างให้ปุ่ม/ตัวอักษรขาวอ่านออก

### 10.2 OSD

- ป้ายกลางจอ 800 ms แล้ว fade ข้อความใหม่แทนที่เก่าทันที
- ป้าย Auto Skip มุมซ้ายล่าง 5 วินาที คลิกได้
- `aria-live="polite"` และ `prefers-reduced-motion` → เหลือแค่ opacity

### 10.3 มือถือ / ทัช และดับเบิลแตะ ±10 วิ (`use-double-tap`)

- ทำงานเฉพาะ `pointerType === "touch"` (เมาส์ไม่มีพฤติกรรม double)
- แบ่งพื้นที่วิดีโอ: **ซ้าย 35%** = −10 วิ, **ขวา 35%** = +10 วิ, **กลาง 30%** = ไม่มีพฤติกรรม double
  (fullscreen ถูกตัดออก)
- แตะครั้งแรก = แสดง/ซ่อน controls ทันที (ไม่รอ) ถ้าแตะครั้งที่สองภายใน 300 ms ในฝั่งเดียวกัน → `seekBy(±10)`
  และคืนสถานะ controls เป็นเหมือนก่อนแตะครั้งแรก
- แตะต่อเนื่อง (แต่ละครั้งห่างกัน < 600 ms) ในฝั่งเดิม = บวกเพิ่มทีละ 10 วิ ("+20 s", "+30 s") แบบ YouTube
- `double-tap-ripple.tsx` แสดงวงกระเพื่อม + ข้อความฝั่งที่แตะ ใช้ `pendingSeekRef` + throttle เดียวกับลูกศร
  (§7.4)
- ใส่ `touch-action: manipulation` บนพื้นที่วิดีโอ กันเบราว์เซอร์ซูมเมื่อดับเบิลแตะและตัดดีเลย์ 300 ms
- แตะบนปุ่ม/control bar ไม่นับเป็น double tap ของวิดีโอ
- อื่น ๆ: ปุ่ม Play ใหญ่ตรงกลางตอน controls แสดง, `playsInline`, hit area ≥ 44×44 px

### 10.4 ระบบภาพ

- **หน้า watch มีแค่ player จึงให้ player เต็ม viewport** (`h-dvh w-full bg-black`, วิดีโอ `object-contain`
  มีแถบดำเมื่อสัดส่วนจอไม่ใช่ 16:9) หน้าตาเหมือนกันทั้งปกติและ fullscreen (01-Actions / 02-Playlist)
  ไม่มีมุมโค้ง · มือถือแนวตั้ง → player เต็มความกว้าง `aspect-video` แล้ว Playlist panel อยู่ด้านล่าง (§6.12, เฉพาะจอเล็กกว่า `lg`)
- `player-frame.tsx` วาดกรอบเดียวกันตั้งแต่ก่อนโหลด JS → ไม่มี layout shift
- `<video poster="/api/art/thumbnail/<episodeId>" playsInline preload="metadata" disableRemotePlayback>`
  (poster อัปเดตตาม ตอนผ่าน props เพราะ element ไม่ remount)
- container ทั้งก้อนขึ้น fullscreen เพื่อให้ controls/OSD/popover/Playlist/หน้าต่างปุ่มลัดอยู่ด้วย
- **สี**: เล่นแล้ว / จุดหัวเล่น / ตอนปัจจุบันใน Playlist ใช้ `theme` (`#05d6a2` ตรงกับดีไซน์อยู่แล้ว) พื้น
  popover / Playlist / ปุ่ม Skip ใช้ `background` หรือ `black` + alpha + `backdrop-blur` ไม่ hard-code hex
  ใหม่ (ถ้าอยากได้พื้น panel โทนอุ่นแบบในภาพ ให้เพิ่ม token `--color-surface` ใน `src/styles/theme.css`)
- **ตัวอักษร**: Geist (มีอยู่แล้ว) ชื่อเรื่อง ~20–24 px, ปุ่ม/รายการ 14 px, เวลา 13 px, เรื่องย่อ 11–12 px

---

## 11. Media Session / PiP / Fullscreen

### 11.1 Media Session (`use-media-session`, ต่อ session)

| action           | ไปที่                                 |
| ---------------- | ------------------------------------- |
| `play` / `pause` | `play()` / `pause()`                  |
| `stop`           | `stop()`                              |
| `seekbackward`   | `seekBy(-(details.seekOffset ?? 10))` |
| `seekforward`    | `seekBy(details.seekOffset ?? 10)`    |
| `seekto`         | `seekTo(details.seekTime)`            |
| `previoustrack`  | `prev ? goTo(prev) : null`            |
| `nexttrack`      | `next ? goTo(next) : null`            |

- `setPositionState` ผ่าน `throttle(1000)` ตอนเล่น + ทันทีตอน `loadedmetadata` / `seeked` clamp
  `position ≤ duration`
- `playbackState` ตาม event (stopped → `"paused"`)
- session unmount → handler เป็น `null` / session ใหม่ตั้งใหม่ทันที `<Lmp>` unmount → `metadata = null`
- ห่อ `setActionHandler` ทุกตัวด้วย try/catch

### 11.2 PiP (`use-picture-in-picture`)

- `isSupported = document.pictureInPictureEnabled && !video.disablePictureInPicture`
- สถานะจาก `enterpictureinpicture` / `leavepictureinpicture` และค่าเริ่มของ session ใหม่อ่านจาก
  `document.pictureInPictureElement === video` (เพราะอาจค้างมาจากตอนก่อน)
- exit เฉพาะตอนออกจากหน้า watch และตอน Stop (§8.5)

### 11.3 Fullscreen (`use-fullscreen`)

- `container.requestFullscreen?.() ?? container.webkitRequestFullscreen?.()` / `document.exitFullscreen()`
- สถานะจาก `fullscreenchange` (+ `webkitfullscreenchange`) ค่าเริ่มของ session ใหม่อ่านจาก
  `document.fullscreenElement === container` (ค้างข้ามตอนได้)
- iPhone: `video.webkitEnterFullscreen()`
- มือถือ: `screen.orientation.lock("landscape")` ห่อ try/catch

---

## 12. Watch progress (`use-watch-progress`)

- `navigator.sendBeacon("/api/progress", blob)` ส่ง `{ trackId, position }` (server ใช้ `tracks.duration` จาก
  DB ตัดสิน `completedAt` ไม่เชื่อ duration จาก client)
- จังหวะ: ทุก 15 วินาทีระหว่างเล่น + `pause` + `seeked` + `ended` + `visibilitychange → hidden` + `pagehide` +
  ก่อน `goTo()`
- **ไม่ส่ง** เมื่อ: `stopped`, ยังไม่ถึง `loadedmetadata`, ตำแหน่งเท่ากับที่ส่งล่าสุด (±1 วิ)
- `ended` → `position = duration` (server ตั้ง `completedAt`)
- `setInterval` หยุดเมื่อ pause และเมื่อ session unmount (กันส่ง track ของตอนเก่าหลังเปลี่ยนตอน)

---

## 13. ข้อเสนอเพิ่มเติม (ตัดสินแล้ว)

| ข้อเสนอ                  | ผล      | อยู่ที่                       |
| ------------------------ | ------- | ----------------------------- |
| หน้าต่างรายการปุ่มลัด    | ✔ ทำ    | §7.8                          |
| Hover preview thumbnail  | ✔ ทำ    | §6.2.4, §16                   |
| ดับเบิลแตะ ±10 วิ        | ✔ ทำ    | §10.3                         |
| ความเร็วการเล่น          | ✘ ไม่ทำ | —                             |
| แสดงเวลาที่เหลือ         | ✘ ไม่ทำ | —                             |
| Theater mode             | ✘ ไม่ทำ | player เต็ม viewport อยู่แล้ว |
| ดับเบิลคลิก = fullscreen | ✘ ไม่ทำ | —                             |
| Document PiP             | พักไว้  | §8.5                          |
| Playlist panel (ดีไซน์)  | ✔ ทำ    | §6.12                         |
| รายการตอนใต้ player      | ✘ ตัด   | ย้ายเข้า Playlist panel       |
| ปุ่ม Stop บน UI          | ✘ ตัด   | shortcut อย่างเดียว (§6.5)    |

---

## 14. ลำดับการลงมือ (Phases)

แต่ละเฟสจบด้วย `bunx prettier --write <ไฟล์ที่แตะ>` และ `bun run build` ผ่าน

| เฟส    | งาน                                                                                                                                                                                                                                                                                                          | ไฟล์หลัก                                                                                      | ผลที่ตรวจได้                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1 ✅   | (**เสร็จ 2026-10-13**: `audioTracks` ดึงจาก `readContentEpisodes` แทน query sibling แยก) Server: readers, `pickTrack`/`resolveAdjacent`/`resolveStartAt`/`toBackHref`, `page.tsx`, `validator.nuqs.ts`, `watch-notice.tsx`, `<video controls>` ชั่วคราวผ่าน native src                                       | `watch/*`                                                                                     | เปิด `/watch?vid=` เล่นได้, vid ผิด/ไม่พบขึ้นกล่องแจ้งเตือนถูกแบบ, prev/next ถูกตอน                  |
| 2 ✅   | (**เสร็จ 2026-10-13**: ทดสอบ headless Chrome แล้ว `<video>` ตัวเดิมข้ามตอน, เล่นต่อหลัง Next; page ต้องมี `instant = false` เอง + `connection()` ใน `resolveSession`) `use-media-source` + `lmp.tsx` / `lmp-session.tsx` / `player-frame` / `lmp-loader`                                                     | `lmp/*`                                                                                       | Range ทีละ fragment, seek แล้ว abort/โหลดใหม่, **เปลี่ยนตอนแล้ว `<video>` เป็น element เดิม** (§3.1) |
| 3 ✅   | (**เสร็จ 2026-10-13**: เพิ่ม `control-button.tsx`, `overlays/playback-error.tsx`; Stop มีใน controller แล้ว รอปุ่มลัดเฟส 4) `use-lmp-controller` + top bar + control bar ตามดีไซน์ (เวลาแยกซ้าย/ขวา, progress, play/pause, ±10, mute + volume slider ตอน hover, prev/next; ไม่มีปุ่ม Stop) + `stores/player` | `lmp/controls/*`, `stores/player/*`                                                           | ทุกปุ่มทำงาน, volume จำค่าหลังรีเฟรช, หน้าตาตรง `00-Overview.png`                                    |
| 4 ✅   | (**เสร็จ 2026-10-13**: ดึง `use-fullscreen`, `use-picture-in-picture` + ปุ่ม PiP/Fullscreen มาจากเฟส 5 เพราะปุ่มลัดต้องใช้; แตะวิดีโอบนมือถือ = แสดง/ซ่อน controls) `hotkeys.ts` + `use-lmp-hotkeys` + OSD + auto-hide + `shortcut-help`                                                                     | `lmp/hotkeys.ts`, `lmp/hooks/use-lmp-hotkeys.ts`, overlays                                    | ปุ่มลัดครบ §7.1 ทั้งแป้นอังกฤษ/ไทย, หน้าต่างปุ่มลัดตรงกับตาราง                                       |
| 5 ✅   | (**เสร็จ 2026-10-13**: ทดสอบ PiP/fullscreen ข้ามตอนแล้วบน Chrome; Edge / Safari ยังต้องลองมือ) ทดสอบ PiP/fullscreen ข้ามตอนบนหลายเบราว์เซอร์, Media Session, ทัช + ดับเบิลแตะ                                                                                                                                | `use-fullscreen.ts`, `use-picture-in-picture.ts`, `use-media-session.ts`, `use-double-tap.ts` | PiP/fullscreen ค้างข้ามตอน (§8.5 ข้อ 6), ปุ่ม media ใช้ได้                                           |
| 6 ✅   | (**เสร็จ 2026-10-13**: body เหลือ `{ vid, position }` (ภายหลังเปลี่ยนชื่อเป็น `trackId`); จำตำแหน่งต่อ track ใน `handoffRef.positions` ให้ Prev / Back ของเบราว์เซอร์เล่นต่อจากเดิม) `/api/progress` + `use-watch-progress` + resume                                                                         | `api/progress/*`                                                                              | ปิดแท็บแล้วเปิดใหม่เล่นต่อ, Stop ไม่เขียนทับ                                                         |
| 7 ✅   | (**เสร็จ 2026-10-13**: เลือก Original เก็บ `audioLanguage = null`; action เรียก `refresh()`; ลบ `?t=` ออกจาก URL หลังเริ่มเล่น; รีเฟรชแล้วเล่นต่อจาก `sessionStorage` เพราะ beacon อาจถึง server ช้ากว่า) `updatePlaybackPreference` + popover Audio Tracks + popover Preferences                            | `watch/actions/update.ts`, `popover.tsx`, `audio-menu.tsx`, `preferences-menu.tsx`            | เปลี่ยนเสียงพากษ์แล้วเวลาเดิม, ตอนต่อไปใช้ภาษาใหม่, หน้าตาตรง `01-Actions.png`                       |
| 7.5 ✅ | (**เสร็จ 2026-10-13**: §6.12.1; ไอคอน `ListVideoIcon`, ไอคอนหัว panel = ปุ่มปิด, Esc ปิดทีละชั้น, แนวตั้งใช้ media `portrait`) Playlist panel (+ วางใต้ player บนมือถือแนวตั้ง)                                                                                                                              | `lmp/playlist/*`, `playlist-button.tsx`                                                       | เลือกตอนได้, panel ยังเปิดหลังเปลี่ยนตอน, หน้าตาตรง `02-Playlist.png`                                |
| 8 ✅   | (**เสร็จ 2026-10-14**: §8.6; การ์ดจบตอนเป็น `end-card.tsx`, แก้บั๊ก MSE ค้างท้ายตอนพากย์ไทย S1) `use-skips` + skip button + `use-autoplay-next` + countdown                                                                                                                                                  | `use-skips.ts`, `use-autoplay-next.ts`                                                        | ตาราง §8.4 ครบทุกแถว                                                                                 |
| 9 ✅   | Sprite sheet: schema + migration, art kind `sprite`, `tests/thumbnail.spec.ts` (**เสร็จ 2026-10-12**, §16.5)                                                                                                                                                                                                 | `contents.schema.ts`, `schema.d.ts`, `api/art/[kind]/[id]/*`, `tests/thumbnail.spec.ts`       | สคริปต์สร้างไฟล์ตรงตำแหน่ง §16.1, DB มี path + grid                                                  |
| 10 ✅  | (**เสร็จ 2026-10-14**: §6.2.5; preview สั่งผ่าน ref ไม่ re-render ตอน hover) Hover preview (`preview-thumbnail`, `use-sprite-preview`) + ~~ขยายช่อง sprite เป็น 192×108 (§16.6)~~ ✅ ทำแล้ว 2026-10-13                                                                                                       | `lmp/controls/preview-thumbnail.tsx`, `tests/thumbnail.spec.ts`                               | hover แล้วภาพตรงเวลา ±interval, ขนาดตรง `01-Actions.png`                                             |
| 11 ✅  | (**เสร็จ 2026-10-14**: §15.1; `<main>` landmark, buffered วาดผ่าน ref) ขัดเกลา a11y / performance                                                                                                                                                                                                            | —                                                                                             | Profiler ตาม §15                                                                                     |

---

## 15. การตรวจสอบ (Verification)

ไม่มี automated test (ตามกฎ) ตรวจด้วย `bun run build` + ทดสอบมือบน `bun run start:dev` (localhost) และ
`bun run start:prod` (LAN, มือถือ) ด้วยบัญชี `user@luminous.co` / `p4ssw02d`

- [ ] เทียบภาพหน้าจอกับ `docs/design/00-Overview.png` (ปกติ), `01-Actions.png` (popover + hover preview),
      `02-Playlist.png` (Playlist เปิด)
- [x] `/watch` ไม่มี `vid` และ `vid=abc` → กล่อง "Invalid link" / UUID ที่ไม่มีในระบบ → กล่อง "Video not
      found" (ไม่ใช่ modal ไม่ใช่หน้า 404)
- [x] ไม่ได้ login → ถูกเด้งตาม `withAuth` / stream ตอบ 401
- [x] RSC payload และ props ไม่มี path ของไฟล์ (ค้น `D:/` ใน Network)
- [x] Network: init segment 1 request แล้ว Range ทีละ fragment, buffer ล่วงหน้า ~30 วิ, ไม่ดึงทั้งไฟล์
- [ ] คลิก progress → กระโดดถูกที่, ลาก → seek ครั้งเดียวตอนปล่อย, buffered แสดงถูก
- [x] Hover progress → ภาพ preview ตรงฉาก (ทดสอบต้น/กลาง/ท้ายตอน และตอนที่ไม่มี sprite → แสดงแค่เวลา)
- [ ] เวลาซ้าย/ขวาเหนือ progress ถูก (`05:12` … `24:00`) และหนัง > 1 ชม. แสดง `h:mm:ss` ทั้งสองฝั่ง
- [ ] Play/Pause/±10/Mute/Prev/Next ทั้งปุ่มและปุ่มลัด, คลิกวิดีโอไม่ทำอะไร, ดับเบิลคลิกไม่ทำอะไร
- [ ] Volume slider กางเมื่อ hover/focus ปุ่มลำโพง และกางชั่วคราวเมื่อกด ↑/↓, ยุบหลังเมาส์ออก
- [ ] ไม่มีปุ่ม Stop บน UI; `Shift+S` และ Stop จาก Media Session → 0:00 + poster, Continue watching
      ยังได้ตำแหน่งก่อน Stop
- [ ] Back ที่ top bar → `backHref` (ตอนนี้ `/browse`) และออกจาก fullscreen ก่อน
- [ ] Popover Audio Tracks: `Original (日本語)` ✓ / `ไทย` แสดงฟอนต์ถูก; Preferences: toggle 2 ตัว + Keyboard
      shortcuts
- [x] ปุ่มลัดทุกตัวทั้งแป้น **อังกฤษ** และ **ไทย** และตอน **Caps Lock** เปิด (Caps Lock + S เฉย ๆ ต้องไม่
      Stop)
- [ ] `Shift + /` เปิด/ปิดหน้าต่างปุ่มลัด ใช้ได้ใน fullscreen, Esc ปิดได้, รายการตรงกับ `HOTKEYS`
- [ ] คลิกปุ่ม Preferences แล้วกด Space → play/pause อย่างเดียว popover ไม่เปิด/ปิดตาม
- [ ] Ctrl+Shift+I / Ctrl+Shift+N / Alt+← ยังเป็นของเบราว์เซอร์
- [ ] กดลูกศรค้าง → เลื่อนต่อเนื่อง ไม่มี request ถูก abort รัว ๆ
- [ ] Fullscreen (Shift+F, ปุ่ม) / ออกด้วย Esc / PiP (Shift+I) บน Chrome, Edge; Firefox แสดง OSD ไม่รองรับ
- [ ] **เปิด PiP แล้ว: กด Next, Shift+N, Autoplay Next ครบ countdown, เปลี่ยนเสียงพากษ์, เลือกตอนใน Playlist →
      หน้าต่าง PiP ไม่ปิด และเล่นตอนใหม่ต่อ** (Chrome, Edge, Safari macOS)
- [x] **fullscreen แล้วเปลี่ยนตอน → ยังอยู่ใน fullscreen**
- [ ] ปุ่ม media บนคีย์บอร์ด / หน้าต่าง PiP / Chrome global media controls แสดงชื่อตอนใหม่หลังเปลี่ยนตอน
- [ ] เปลี่ยนเสียงพากษ์ → เล่นต่อที่เวลาเดิม, `preferences.audio_language` ถูกอัปเดต, Next แล้วได้ภาษาใหม่
- [ ] Toggle Autoplay Next / Auto Skip → DB เปลี่ยน รีเฟรชแล้วยังอยู่ เปลี่ยนตอนแล้วค่าที่แสดงยังถูก
- [x] ตาราง §8.4 ครบ 5 แถว + undo ของ Auto Skip + seek เข้าช่วง intro เองต้องไม่ถูกข้าม
- [x] Next ตอนสุดท้ายของ season → EP1 ของ season ถัดไป, ตอนสุดท้ายของเรื่อง → ปุ่ม disabled
- [x] URL เป็น `?vid=<episodeId>`: เปิดลิงก์เดิมแล้วได้ภาษาตาม preference, `&audio=th-TH` ได้พากย์ไทย,
      `&audio=` ภาษาที่ตอนนั้นไม่มี → ต้นฉบับ
- [ ] พากย์ไทยมีแค่ EP1–6 ของ 12: ดูไทย EP6 → ปุ่ม Next / Shift+N / Media Session next ไม่มี, จบตอนขึ้นการ์ด
      "EP07 isn't available in ไทย yet" ไม่นับถอยหลัง (แม้ Autoplay Next เปิด), กด "Watch in Original" → EP7
      ต้นฉบับ; ดูต้นฉบับ EP6 → Next ไป EP7 ต้นฉบับปกติ
- [ ] Back ของเบราว์เซอร์หลัง Next → กลับตอนเดิม (และ PiP ยังค้าง)
- [ ] Playlist: เปิดแล้วเลื่อนไปตอนปัจจุบัน, ตอนปัจจุบันเป็นสี theme + ▷, เลือกตอนแล้ว panel ยังเปิด,
      ตอนที่ไม่มี track กดไม่ได้, content หลาย season สลับ season ได้, Esc ปิดได้, ใช้ได้ใน fullscreen
- [x] มือถือแนวตั้ง: Playlist อยู่ใต้ player / แนวนอน: ซ้อนทับด้านขวา
- [ ] มือถือ: ดับเบิลแตะซ้าย/ขวา ±10 วิ, แตะต่อเนื่องสะสม +20/+30, แตะกลางไม่ทำอะไร, ไม่ซูมหน้า; iOS Safari
      (ManagedMediaSource, fullscreen native, ไม่มี volume slider), Android Chrome
- [ ] ดูจนจบตอนยาว ไม่มี `QuotaExceededError` ค้าง
- [x] เปลี่ยนตอน 10 ครั้งติด → ไม่มี fetch/listener/interval ของตอนเก่าค้าง (Network + Performance monitor),
      ไม่มี beacon ของ track เก่า
- [ ] ออกจากหน้า watch → Media Session ล้าง, PiP ปิด
- [x] React DevTools Profiler: ระหว่างเล่น re-render แค่ `time-display`
- [x] `tests/thumbnail.spec.ts` รันซ้ำได้, ไม่ทับ thumbnail ที่มีอยู่ถ้าไม่ใส่ `--force`, import track
      ซ้ำแล้วไม่สแกนโฟลเดอร์ `Thumbnails`

### 15.1 ผลเฟส 11 — a11y / performance (✅ 2026-10-14)

ทดสอบด้วย headless Chrome 155 + สคริปต์วัดผล (hook แทน React DevTools นับ component ที่ render ต่อ commit, นับ
interval / listener ผ่าน CDP, ดัก `sendBeacon`, axe-core 4.10)

แก้ในเฟสนี้

- **`PlayerFrame` เป็น `<main>`** (axe `region`: เนื้อหาไม่อยู่ใน landmark — เป็น violation
  เดียวที่เจอในทุกสถานะ: ปกติ, popover ทั้งสอง, หน้าต่างปุ่มลัด, Playlist, การ์ดจบตอน) ref ของ container
  เปลี่ยนเป็น `HTMLElement` → axe เหลือ 0
- **buffered ของ progress bar วาดผ่าน ref** (เหมือนส่วนที่เล่นแล้ว) แทน `useVideoEvent` → ระหว่างเล่น
  re-render แค่ `TimeDisplay` (10 ครั้ง / 10 วิ) เดิม `ProgressBar` + `PreviewThumbnail` render ทุกครั้งที่
  append fragment
- ปุ่ม Skip ไม่ย่อขนาดเมื่อ `prefers-reduced-motion`

ผลวัด

- hover progress bar 40 ครั้ง → ไม่มี render ต่อการขยับ (มีแค่ครั้งเดียวตอน controls ขึ้น)
- Network ตอนแรก: 9 request, init segment 1 ครั้ง, ทุก request มี `Range`, buffer ล่วงหน้า ~36 วิ
- เปลี่ยนตอน 10 ครั้ง (Shift+N ×5, Shift+P ×5): listener บน `<video>` / `window` และจำนวน interval เท่าเดิม,
  `<video>` ตัวเดิม, beacon ทุกตัวเป็นของ track ที่กำลังออก ไม่มีของ track เก่าหลังเปลี่ยน
- ออกจากหน้า (Back → `/browse`): Media Session ล้าง (`metadata = null`), interval 0; Next 16 เก็บหน้า watch
  ไว้แบบซ่อน (Activity) แต่ `<video>` ถูกล้าง (`src` ว่าง, `networkState 0`)
- Tab order: Back → Playlist → Seek → Audio tracks → Mute → Volume → Prev → −10 → Play → +10 → Next → PiP …
  ทุกจุดมี focus outline
- ไม่ login: `/watch` → 307 ไป error-boundary 401, stream / progress → 401; `vid` ว่าง / `abc` → "Invalid
  link", UUID ที่ไม่มี → "Video not found"; HTML + RSC ไม่มี path ของไฟล์
- ปุ่มลัด: Caps Lock + S ไม่ Stop, แป้นไทย Shift+M (`?`) mute / Shift+S (`ฆ`) Stop, Ctrl+Shift+N ไม่ถูกดัก
- S1E12 + fullscreen + Shift+N → S2E1 ยัง fullscreen, Back ของเบราว์เซอร์ → S1E12 (`<video>` เดิม); ตอนสุดท้าย
  ปุ่ม Next `aria-disabled`; `&audio=th-TH` → ไทย, `&audio=ko-KR` (ไม่มี) → Original

ยังต้องทดสอบด้วยมือ (ทำอัตโนมัติไม่ได้ใน headless): Edge / Firefox / Safari, PiP ข้ามตอนทุกกรณี, ปุ่ม media
บนคีย์บอร์ด, มือถือจริง (ทัช, iOS Safari, Android), ดูจนจบตอนยาวหา `QuotaExceededError`, การ์ดตอนที่ไม่มี
track ใน Playlist และตอนที่ไม่มี sprite (ข้อมูลตอนนี้ไม่มีกรณีเหล่านี้)

---

## 16. Thumbnail และ Sprite sheet

### 16.1 ตำแหน่งไฟล์

```
<CONTENTS_SOURCE_DIR>/Frieren/
├── 1/01.mp4 …                             source ต้นฉบับ (seasons.sources)
├── Thai Dub/1/01.mp4 …                    source พากย์ (seasons.sources)
└── Thumbnails/
    └── 1/                                 ชื่อโฟลเดอร์ของ source ต้นฉบับ (movie: ชื่อไฟล์ตัด .mp4)
        ├── 01.webp                        episodes.thumbnail   (640×360)
        ├── 01-sprite-sheet.webp           episodes.sprite      (grid 192×108 ต่อช่อง, §16.6)
        ├── 02.webp
        └── 02-sprite-sheet.webp
```

- รูปแบบ: `{art}/{NN}.webp` และ `{art}/{NN}-sprite-sheet.webp` โดย `{art} = seasonArtDirectory(sources)`
  (`Thumbnails/<name>` ข้าง source ต้นฉบับ) และ `NN = String(episodeNo).padStart(2, "0")`
  (เหมือนชื่อไฟล์วิดีโอ `01.mp4`)
- **หนึ่งชุดต่อตอน** ใช้ร่วมกันทุกภาษา (สร้างจาก track ต้นฉบับ)
- `tests/track.spec.ts` ไม่สแกนโฟลเดอร์นี้ เพราะอ่านเฉพาะ path ใน `seasons.sources` และไฟล์ชื่อ `01.mp4`
- art route ตรวจด้วย `isSafeMediaPath(path, seasonArtDirectory(sources), IMAGE_EXTENSIONS)`

### 16.2 Schema (`episodes`)

```ts
sprite: text("sprite_sheet_path"),                                     // null = ยังไม่มี sprite
spriteGrid: jsonb("sprite_sheet_grid").$type<Content.SpriteGrid>(),    // null = ยังไม่มี sprite
```

```ts
// src/types/schema.d.ts (namespace Content)
/**
 * Layout of an episode's sprite sheet: tile `i` shows `i × interval` seconds,
 * e.g. `{ interval: 10, width: 160, height: 90, columns: 10, count: 144 }`
 */
export type SpriteGrid = { interval: number; width: number; height: number; columns: number; count: number }
```

- `episodes.thumbnail` (`thumbnail_path`) มีอยู่แล้ว ใช้ตามเดิม
- สร้าง migration ด้วย `bun run drizzle:generate` แล้ว `bun run drizzle:migrate` (ตาม `database.md`)
- `sprite` (path) ห้ามส่งให้ client ส่งแค่ `spriteGrid`

### 16.3 Art route kind `sprite`

- `validator.zod.ts`: `kind: z.enum(["poster", "thumbnail", "sprite"])`
- `actions/read.ts`: `readSprite(episodeId)` แบบเดียวกับ `readThumbnail` (path +
  `seasonArtDirectory(sources)`, `cacheTag("episodes/<id>")`)
- ตรวจด้วย `isSafeMediaPath` + `IMAGE_EXTENSIONS`, header/ETag/304 เหมือน kind อื่น, ไม่มี auth เหมือน kind
  อื่น
- ฝั่ง client ใช้เป็น CSS background ตรง ๆ (ไม่ผ่าน `next/image`)

### 16.4 สคริปต์ `tests/thumbnail.spec.ts`

```bash
bun tests/thumbnail.spec.ts --season <seasonId> [--force]
```

ขั้นตอน (ต้นแบบจาก `tests/track.spec.ts`: ตรวจทุกอย่างก่อนเขียน)

1. อ่าน season (`sources`) + episodes + track ต้นฉบับของแต่ละตอน (`isDubbed = false`, ไม่มีก็ใช้ track แรก)
2. ตรวจก่อน: มี `ffmpeg` ใน PATH, ไฟล์วิดีโอทุกไฟล์มีอยู่จริง ไม่ผ่านข้อใด → แสดงรายการแล้วหยุด ไม่เขียนอะไร
3. `mkdir -p seasonArtDirectory(sources)`
4. **Thumbnail** (ข้ามถ้าไฟล์มีอยู่แล้ว เว้นแต่ `--force` เพื่อไม่ทับรูปที่เลือกเอง):
   - เวลาที่จับภาพ: `intro.to + 30` ถ้ามี skip `intro` ไม่งั้น `25%` ของความยาว (หลบจอดำและ opening)
   - `ffmpeg -ss <t> -i <video> -frames:v 1 -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2" -c:v libwebp -quality 80 <NN>.tmp.webp`
5. **Sprite sheet** (ข้ามถ้ามีอยู่และ grid ใน DB ตรง เว้นแต่ `--force`):
   - `interval = 10`, `width = 160`, `height = 90`, `columns = 10`, `count = ceil(duration / interval)`,
     `rows = ceil(count / columns)`
   - WebP กว้าง/สูงได้ไม่เกิน 16383 px → `rows × 90 ≤ 16383` → ถ้าเกิน (หนังยาวเกิน ~5 ชม.) เพิ่ม `interval`
     จนพอดี
   - `ffmpeg -skip_frame nokey -i <video> -vf "fps=1/<interval>,scale=160:90:force_original_aspect_ratio=decrease,pad=160:90:(ow-iw)/2:(oh-ih)/2,tile=<columns>x<rows>" -frames:v 1 -an -c:v libwebp -quality 60 <NN>-sprite-sheet.tmp.webp`
   - `-skip_frame nokey` ถอดรหัสแค่ keyframe → เร็วขึ้นหลายเท่า (ภาพอาจคลาดจากเวลาจริงไม่เกินระยะห่าง keyframe
     ~2–4 วิ ซึ่งพอสำหรับ preview)
   - ตอน 24 นาที → 144 ช่อง → 1600×1350 px ≈ 150–300 KB
6. เขียนไฟล์ `.tmp.webp` ก่อนแล้ว rename ทับ (ไม่เหลือไฟล์ครึ่ง ๆ ถ้าสคริปต์ล้ม)
7. อัปเดต DB ต่อตอน: `thumbnail`, `sprite` (full path, forward slash) และ `spriteGrid`
8. `db.$client.end()` ตอนจบ
9. หมายเหตุ: ถ้า server รันอยู่ ค่าที่ cache ไว้ (`readThumbnail`/`readSprite`/`readContentEpisodes`,
   `cacheLife("hours")`) จะเห็นผลหลัง cache หมดอายุหรือรีสตาร์ท server

### 16.5 ผลการทำเฟส 9 (✅ เสร็จ 2026-10-12)

ไฟล์ที่แตะ

- `src/drizzle/schema/contents.schema.ts`: `episodes.sprite` (`sprite_sheet_path`), `episodes.spriteGrid`
  (`sprite_sheet_grid`)
- `src/types/schema.d.ts`: `Content.SpriteGrid`
- migration `src/drizzle/migrations/20261012062458_add_episode_sprite` (ADD COLUMN 2 คอลัมน์) **รันลง DB
  จริงแล้ว**
- `src/app/api/art/[kind]/[id]/`: `validator.zod.ts` (kind `sprite`), `actions/read.ts` (`readSprite`),
  `route.ts` (`READERS.sprite`)
- `tests/thumbnail.spec.ts` (ใหม่)
- guide: `video-streaming.md` (§ Thumbnails & sprite sheets), `database.md` (คอลัมน์ใหม่ + server-only)

ต่างจากแผน §16.4

- **sprite ได้ช่องครบ `count` เสมอ**: `-skip_frame nokey` ทำให้ `fps` หยุดที่ keyframe สุดท้าย
  ซึ่งไฟล์ทดสอบอยู่ก่อนจบ ~10 วิ → ได้ 142 ช่องแทน 143 จึงเพิ่ม
  `tpad=stop_mode=clone:stop_duration=<interval×2>` ก่อน `fps` และ `trim=end_frame=<count>` หลัง `fps` →
  จำนวนช่องตรงกับ `spriteGrid.count` ใน DB ทุกครั้ง
- เพิ่ม `setsar=1` ท้าย scale/pad (กันวิดีโอที่ pixel ไม่เป็นสี่เหลี่ยมจัตุรัส)
- `interval` ขยายทีละ 5 วิ เมื่อแผ่นสูงเกิน 16383 px
- อัปเดต DB หลังเสร็จแต่ละตอน (ถ้าล้มกลางทาง DB ตรงกับไฟล์ที่มีจริง) และอัปเดต path ของ thumbnail
  ที่มีอยู่แล้วด้วย (กรณีวางรูปเองไว้ก่อน)
- `duration` ใช้ `tracks.duration_seconds` ของ track ต้นฉบับ

ผลทดสอบกับ "Sono Bisque Doll wa Koi wo Suru" season 1 (12 ตอน, 1080p, ~24 นาที)

- ~3 วิ/ตอน รวม 37 วิ, sprite 1600×1350 px 143 ช่อง ~40–50 KB, thumbnail 640×360 ~3 KB
- รันซ้ำไม่ใส่ `--force` → ข้ามทุกไฟล์ (70 ms), DB มี `thumbnail_path`, `sprite_sheet_path`,
  `sprite_sheet_grid` ครบ
- `tests/track.spec.ts` ไม่สแกน `Thumbnails/` (ตรวจด้วย `findSourceFolders` แล้ว)
- `GET /api/art/sprite/<episodeId>` → 200 `image/webp`, ETag ตรง → 304, kind ผิด / id ไม่มี → 404;
  `/api/art/thumbnail/<id>` → 200
- `bun run build` ผ่าน
- ข้อสังเกต: วิดีโอ ja-JP ชุดนี้มีซับไทยฝังในภาพ (hardsub) จึงติดมาใน thumbnail/sprite ด้วย

### 16.6 ขยายช่อง sprite เป็น 192×108 (✅ เสร็จ 2026-10-13 ก่อนเฟส 10)

ดีไซน์ (`01-Actions.png`) แสดง hover preview กว้าง ~200 px แต่เฟส 9 สร้างช่องไว้ 160×90 ถ้าขยายช่อง 160×90
ด้วย CSS ภาพจะเบลอ จึงสร้างใหม่ที่ **192×108** แล้วแสดง 1:1

- `tests/thumbnail.spec.ts`: เปลี่ยนค่าคงที่ `width = 192`, `height = 108` (ใช้ใน `scale=` / `pad=` ด้วย)
  `columns = 10` เท่าเดิม → แผ่นกว้าง 1920 px, ตอน 24 นาที 143–144 ช่อง = 15 แถว = 1920×1620 px
- เพดาน WebP: `rows × 108 ≤ 16383` → ≤ 151 แถว ≈ 4.2 ชม. ที่ interval 10 วิ (เกินนั้น interval ขยายทีละ 5 วิ
  ตามกลไกเดิม)
- รันใหม่ด้วย `--force` ทุก season ที่สร้างไปแล้ว (เช่น Sono Bisque Doll season 1) ให้ `spriteGrid` ใน DB
  เปลี่ยนตาม แต่ `--force` สร้าง thumbnail ใหม่ด้วย → ถ้ามี thumbnail ที่เลือกเองไว้ ให้เพิ่ม flag แยก (เช่น
  `--sprites-only`) แทน
- อัปเดตตัวอย่าง `SpriteGrid` ใน `src/types/schema.d.ts` และคำอธิบายใน `video-streaming.md` ให้เป็น 192×108
- ฝั่ง player ไม่ต้องแก้ เพราะอ่านขนาดจาก `spriteGrid` อยู่แล้ว

ผลการทำ (2026-10-13)

- `tests/thumbnail.spec.ts`: `SPRITE_TILE = { width: 192, height: 108, columns: 10 }` และ doc comment;
  `src/types/schema.d.ts`: ตัวอย่าง `SpriteGrid` เป็น 192×108; `video-streaming.md`: ขนาด, คำสั่ง ffmpeg,
  เพดาน ~4.2 ชม.
- **ไม่ต้องใช้ `--force` และไม่ต้องเพิ่ม `--sprites-only`**: สคริปต์สร้าง sprite ใหม่อยู่แล้วเมื่อ
  `spriteGrid` ใน DB ไม่ตรงกับ grid ที่คำนวณได้ (`!isEqual(episode.spriteGrid, grid)`) และเก็บ thumbnail
  ที่มีอยู่ไว้ → รันซ้ำแบบปกติก็พอ (ตรวจแล้ว: mtime ของ thumbnail ไม่เปลี่ยน)
- รันใหม่ทั้ง Sono Bisque Doll season 1 และ season 2 (season 2 เพิ่มเข้ามาหลังเฟส 9): 24 ตอน ~3–4 วิ/ตอน แผ่น
  1920×1620 px 143 ช่อง ~52–62 KB, DB `sprite_sheet_grid` เป็น 192×108 ครบทั้ง 24 ตอน
- ฝั่ง player ไม่ต้องแก้ (ยังไม่มี และจะอ่านขนาดจาก `spriteGrid`)

### 16.7 รวมสคริปต์ (2026-10-13)

`tests/thumbnail.spec.ts` ถูกรวมเข้า `tests/track.spec.ts` แล้ว (ที่อื่นในแผนนี้ที่เขียน
`tests/thumbnail.spec.ts` ให้อ่านเป็น "ขั้น art ของ `tests/track.spec.ts`") รันครั้งเดียวได้ทั้ง remux →
import → thumbnail/sprite:

```bash
bun tests/track.spec.ts --season <seasonId> [--remux] [--force]
```

ส่วนประกอบแยกไว้ใน `tests/tracks/*` (`source.ts`, `mp4.ts`, `codec.ts`, `ffprobe.ts`, `ffmpeg.ts`,
`thumbnail.ts`, `sprite.ts`, `constants.ts`, `utils.ts`, `validator.zod.ts`) พฤติกรรมเดิมทุกอย่าง (`--force`
สร้าง art ใหม่, ไม่ใส่ก็เก็บ thumbnail เดิมและสร้าง sprite ใหม่เมื่อ grid ไม่ตรง)

- **2026-10-13: art ใช้ภาพจาก track พากย์ (`isDubbed = true`) ก่อน** ถ้ามีหลายภาษาเอาตัวแรกตามชื่อภาษา
  ไม่มีพากย์ค่อยใช้ต้นฉบับ (log ของขั้น art แสดงภาษาที่ใช้ เช่น `🖼️ E01 th-TH …`) รัน season 1 ใหม่ด้วย
  `--force` แล้ว: sprite 145 ช่อง (track พากย์ยาว 1450 วิ) และ thumbnail ไม่มีซับไทยฝังแล้ว
