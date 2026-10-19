# Content Season Page (`/content/[seasonId]`) — แผนงาน

> เขียนเมื่อ 2026-10-16 · แก้ไขรอบ 2 (ตอบคำถาม §8 แล้ว: Q4 สี chip, Q6 ไอคอนตอนที่ดูค้าง)
> · สถานะ: เสร็จแล้ว (ดู §9) · ยังไม่ได้ทดสอบ episode grid กับข้อมูลจริง เพราะ DB
> ยังไม่มีตอน
>
> ดีไซน์อ้างอิง: `docs/design/content-page.png` (desktop 1920px, กรอบเนื้อหากว้าง 1440px =
> `max-w-8xl`)

## 0. Context

หน้า `src/app/(public)/content/[seasonId]/page.tsx` ยังเป็น `<section>` ว่าง และ
`actions/read.ts` มีแค่ `"use server"` ปุ่ม Watch ในหน้า browse (`watch-link.tsx`)
ลิงก์มาที่ `/content/${seasonId}` อยู่แล้ว ส่วนปุ่ม Back ของ player (`toBackHref()` ใน
`watch/utils.ts`) ยังชี้ไป `/browse` เพราะ "ยังไม่มีหน้า content"

หนึ่งหน้า = **หนึ่ง season** (poster, status, วันฉาย และ synopsis เป็นของ season)
โดยดึงข้อมูลของ content แม่มาแสดงด้วย

**เป้าหมาย**: หน้า season ตามดีไซน์ ที่ render แบบ plain SSR, query ขนานกัน, cache ข้อมูล
catalogue และใช้ได้ทั้ง desktop และมือถือบน LAN

## 1. สิ่งที่อ่านได้จากดีไซน์

| ส่วน                    | รายละเอียด                                                                                                                                                                                                    | ข้อมูลจาก                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Hero**                | poster ซ้าย (~200×280), ขวาคือ chip genre สีธีม → ชื่อเรื่องตัวใหญ่ → ชื่อญี่ปุ่น → แถว meta                                                                                                                  | `seasons.poster` ผ่าน `/api/art/poster/[id]`                                                                    |
| Chip genre              | `Action (ต่อสู้)`, `Adventure (ผจญภัย)` พื้น `theme`                                                                                                                                                          | `contents.genres` → ข้อความจาก `@/constants/data/genres`                                                        |
| ชื่อเรื่อง              | `Kanojo Okarishimasu Season 2`                                                                                                                                                                                | `contents.title` + `seasonName(season)` (หรือ `seasons.title` ถ้ามี — §8 Q5)                                    |
| ชื่อรอง                 | `彼女、お借りします`                                                                                                                                                                                          | `contents.altTitles.JP` (ไม่มีก็ไม่แสดง)                                                                        |
| แถว meta                | `Kind: Anime Series` · `Source: Manga` · `Aired: Winter (2022)` · `Status: Currently Airing` (label สีเทา, ค่าสีขาว)                                                                                          | `contents.kind/source`, `seasons.releasedOn/status`                                                             |
| **Synopsis**            | หัวข้อ + ย่อหน้า กว้างประมาณ 2 ใน 3 ของคอลัมน์หลัก                                                                                                                                                            | `seasons.synopsis ?? contents.synopsis`                                                                         |
| **Episodes**            | grid 3 คอลัมน์: thumbnail 16:9 มุมมน (~110px) + `EP 01` ตัวหนา + ชื่อตอน + ไอคอนคลื่นเสียงสีธีม + รหัสภาษา `JP TH` (บางตอนมีแค่ `JP`)                                                                         | `episodes` + ภาษาของ `tracks` ของแต่ละตอน                                                                       |
| **Sidebar** (ขวา 320px) | การ์ด season อื่นของ content เดียวกัน: poster 3:4 เล็ก, chip ชนิด สีตาม kind (`Season` / `Special` / `The Movie` / `Spinoff`) + chip `Winter (2022)` สีเทา, ชื่อ 2 บรรทัด, พื้นการ์ดเข้มกว่าเล็กน้อย + ขอบบาง | `seasons` ที่ `contentId` เดียวกัน เรียงตาม `releasedOn` — **ไม่รวม** season ปัจจุบัน (Season 2 ไม่อยู่ในลิสต์) |
| พื้นหลัง                | hero บนพื้น `background` เรียบ ๆ ส่วน body มีแสง radial สีธีมจาง ๆ ตรงกลาง (ไม่มีภาพ backdrop เบลอ)                                                                                                           | —                                                                                                               |
| Header / Nav            | ไม่มีในดีไซน์ (layout `(public)` ก็ยังไม่มี) — ไม่ทำในงานนี้                                                                                                                                                  | —                                                                                                               |

## 2. Data — `actions/read.ts` (route-local)

เป็น **cached reader** ที่เรียกจาก Server Component เท่านั้น จึง **ลบ `"use server"` ออก**
(แบบเดียวกับ `watch/actions/read.ts`) ไม่อย่างนั้นทุก export จะกลายเป็น public endpoint

### 2.1 `readSeasonDetail(seasonId)`

`"use cache"` + `cacheLife("hours")` + `cacheTag("seasons/${seasonId}", "seasons/list")`
(`seasons/list` ถูก invalidate ตอน import season ใหม่ใน `actions/contents/create.ts`
อยู่แล้ว ทำให้ sidebar เห็น season ใหม่)

ข้างในมี 2 query วิ่งใน `Promise.all`:

1. **season ปัจจุบัน + content** — `seasons innerJoin contents where seasons.id = $1`
   - season: `id, kind, seasonNo, title, synopsis, status, releasedOn`
   - content: `id, title, altTitles, kind, source, genres, synopsis`
2. **season ทั้งหมดของ content เดียวกัน** —
   `where seasons.content_id = (select content_id from seasons where id = $1)` ใช้
   subquery เพื่อไม่ต้องรอ query 1 ก่อน · เลือก `id, kind, seasonNo, title, releasedOn` ·
   เรียงแบบเดียวกับ `readContentEpisodes` (`releasedOn, createdAt, id`) · ใช้ index
   `seasons_content_released_on_index`

คืน `{ season, content, seasons }` (กรอง season ปัจจุบันออกจาก `seasons`) หรือ `null`
ถ้าไม่พบ ไม่มี path ไฟล์ใด ๆ หลุดออกไป (`poster`, `sources` ไม่ถูก select)

### 2.2 `readSeasonEpisodes(seasonId)`

`"use cache"` + `cacheLife("hours")` + `cacheTag("seasons/${seasonId}/episodes")`

query เดียว: `episodes leftJoin tracks where episodes.season_id = $1` เรียง
`episodeNo, tracks.isDubbed, tracks.language` แล้ว `groupBy` ด้วย es-toolkit (เหมือน
`readContentEpisodes`) ไม่มี N+1

แต่ละตอนคืน: `id, episodeNo, kind, title, hasThumbnail` (`thumbnail_path is not null` —
ส่งแค่ boolean ไม่ส่ง path) และ `audios: { language, isDubbed }[]` ต้นฉบับมาก่อน

### 2.3 ลำดับใน page

```ts
const [detail, episodes] = await Promise.all([
  readSeasonDetail(id),
  readSeasonEpisodes(id)
])
if (!detail) notFound()
```

ทั้งสาม reader (รวม §2.4) ใช้แค่ `seasonId` → ทุก query วิ่งขนานกัน ไม่มี await ซ้อน

### 2.4 ตอนที่ดูค้างไว้ — `readResumeEpisodeId(seasonId)` (§8 Q6)

ไม่ทำปุ่ม Continue แต่ตอนที่ดูค้างไว้จะมี `PlaySquareIcon` อยู่หน้า `EP 00`

- `watch_histories` เก็บ **แถวเดียวต่อ account ต่อ content** (ตอนล่าสุด + ตำแหน่ง)
  จึงมีได้มากสุด 1 ตอนที่ "ค้างอยู่" และนับเฉพาะ `completed_at is null`
  (ดูจบแล้วไม่นับว่าค้าง)
- หน้านี้เป็น public: เพิ่ม `readSessionAccount()` ใน `@/actions/auth` (`cookies()` +
  `resolveSession` คืน account หรือ `null` **ไม่ redirect**) ต่างจาก `withAuth` ที่
  redirect
- query:
  `watch_histories innerJoin episodes where account_id = $1 and episodes.season_id = $2 and completed_at is null limit 1`
  → คืน `episodeId | null` (ยังไม่ sign in → `null` ไม่ยิง query)
- เป็นข้อมูลต่อผู้ใช้ → **ไม่ cache** ตามกฎ และเพราะใช้แค่ `seasonId` จึงวิ่งใน
  `Promise.all` เดียวกับ §2.1–2.2

## 3. ไฟล์ที่จะสร้าง / แก้

```
src/app/(public)/content/[seasonId]/
├── page.tsx                  แก้: parse params → Promise.all → compose, generateMetadata, notFound()
├── validator.zod.ts          ใหม่: paramValidator = z.object({ seasonId: z.uuid() })
├── utils.ts                  ใหม่: helper เฉพาะหน้า (เช่น รหัสภาษา `ja-JP` → `JP`, ข้อความ genre จาก slug)
├── actions/read.ts           แก้: readSeasonDetail, readSeasonEpisodes (§2)
└── components/
    ├── season-hero.tsx       poster + chips + title + alt title + meta (Server Component)
    ├── episode-grid.tsx      หัวข้อ Episodes + grid + empty state
    ├── episode-card.tsx      การ์ดหนึ่งตอน → `/watch?vid=<episodeId>` (prefetch={false})
    ├── season-list.tsx       sidebar: ลิสต์ season อื่น
    └── season-card.tsx       การ์ด season → `/content/<seasonId>`
```

ไม่มี Client Component ใหม่: ลิงก์ใช้ `Link` จาก `@/components/link` (ตัวนั้นเป็น client
อยู่แล้ว) ส่วน `Chip` ของ HeroUI render บน server ได้ (หน้า browse ใช้อยู่แล้วใน
`content-card.tsx`)

### 3.1 ย้ายของที่ตอนนี้ใช้ 2 route ขึ้นไปเป็น shared (ย้าย ไม่ copy)

| ของ                                                                                                           | จาก                       | ไป                                                          |
| ------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------- |
| `KIND_LABELS`, `SOURCE_LABELS`, `STATUS_LABELS`, `SEASONAL_LABELS`                                            | `browse/utils.ts`         | `src/constants/labels.ts` (import ตรง `@/constants/labels`) |
| `SEASONALS`, `Seasonal`                                                                                       | `browse/validator.zod.ts` | `src/constants/index.ts` (ข้าง `SEASON_KINDS`)              |
| ใหม่: `airedLabel(releasedOn)` → `"Winter (2022)"` (เดือน 1–3 = winter … ตรงกับ `extract(quarter)` ใน browse) | —                         | `src/libs/season.ts` (ข้าง `seasonName`)                    |
| ใหม่: `SEASON_KIND_LABELS` + สี chip ตาม kind (§8 Q4)                                                         | —                         | `src/constants/labels.ts`                                   |

แล้วแก้ import ใน `browse/*` ให้ชี้ที่ใหม่ (`content-card`, `filter-drawer`,
`kind-select`, `read.ts`, `read-filters.ts`, `validator.nuqs.ts`, `validator.zod.ts`)

### 3.2 แก้ปุ่ม Back ของ player

`toBackHref()` ใน `watch/utils.ts` รับ `seasonId` แล้วคืน `/content/${seasonId}`
(`toPlayerProps` มี `season.id` อยู่แล้ว) —
คอมเมนต์ของฟังก์ชันบอกไว้ว่าเป็นจุดเดียวที่ต้องแก้เมื่อมีหน้านี้

## 4. Layout & Responsive

| ส่วน     | `< sm` (มือถือ)                             | `sm – lg`                      | `≥ lg` (ตามดีไซน์)                                              |
| -------- | ------------------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| Hero     | poster `w-32` อยู่บน, ข้อความใต้ poster     | poster `w-40` ซ้าย, ข้อความขวา | poster `w-50` (`aspect-[5/7]`) ซ้าย, ข้อความขวา จัด `items-end` |
| Body     | คอลัมน์เดียว: synopsis → episodes → sidebar | เหมือนกัน                      | `grid-cols-[minmax(0,1fr)_20rem]` gap ใหญ่                      |
| Episodes | 1 คอลัมน์                                   | 2 คอลัมน์                      | 2 คอลัมน์ (`lg`) → 3 คอลัมน์ (`xl+`)                            |
| Sidebar  | การ์ดเรียงลง                                | grid 2 คอลัมน์                 | การ์ดเรียงลงในคอลัมน์ขวา                                        |

- กรอบนอก: `max-w-8xl mx-auto px-4` (เหมือน browse)
- แสงพื้นหลัง: `radial-gradient` จาก `theme-950` โปร่งใสต่ำ ใส่บน wrapper ของ body เป็น
  class static (ไม่ใช้ `bg-${…}`)
- รูปทั้งหมดใช้ `next/image` + `fill` ในกล่องที่จอง aspect ratio ไว้ (กัน CLS) และ `sizes`
  ตามขนาดจริง: hero poster `preload` + `quality={75}` (เป็นรูปเดียวที่ preload) ·
  thumbnail `sizes='110px'` · poster ใน sidebar `sizes='60px'`
- ไอคอนคลื่นเสียง: `AudioWave01Icon` จาก `@hugeicons/core-free-icons`
  (จะเทียบกับดีไซน์ตอนทำอีกที)
- รหัสภาษาใส่ `title` / `aria-label` เป็นชื่อเต็ม (เช่น "Japanese, Thai dub") เพื่อ screen
  reader

## 5. Metadata

`generateMetadata` เรียก `readSeasonDetail` ตัวเดียวกับ page (cache เดียวกัน ไม่ query
ซ้ำ): `title` = ชื่อเต็มของ season (template `%s • Luminous • …` เติมให้เอง),
`description` = synopsis ตัดสั้น `export const instant = false` เหมือน browse (หน้านี้
block ที่ DB query)

## 6. Edge cases

| กรณี                                  | พฤติกรรม                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `seasonId` ไม่ใช่ UUID / ไม่มีในระบบ  | `notFound()` → `app/not-found.tsx`                                               |
| season ยังไม่มีตอน                    | หัวข้อ Episodes + ข้อความ "No episodes yet"                                      |
| ตอนที่ยังไม่มี track                  | การ์ดแสดงแต่กดไม่ได้ (`aria-disabled`, จาง) แบบเดียวกับ `PlaylistItem` ใน player |
| ตอนที่ไม่มี thumbnail                 | กล่องสีพื้นแทน ไม่ยิง `/api/art/thumbnail` ที่จะได้ 404                          |
| season ชนิด `movie`                   | การ์ดเขียน `Movie` แทน `EP 01` (เหมือน playlist)                                 |
| ไม่มี synopsis / source / altTitle JP | ซ่อนส่วนนั้น                                                                     |
| content มี season เดียว               | ไม่แสดง sidebar และให้คอลัมน์หลักเต็มความกว้าง                                   |
| กดตอนโดยยังไม่ sign in                | ไป `/watch?vid=` ตามปกติ หน้า watch จัดการเองด้วย `withAuth`                     |

## 7. ลำดับการทำ & การตรวจ

1. ย้าย labels / `SEASONALS` เป็น shared + เพิ่ม `airedLabel` แล้วแก้ import ใน browse
   (§3.1)
2. `validator.zod.ts` + `actions/read.ts` (§2)
3. Components ทีละส่วน: hero → episodes → sidebar
4. `page.tsx` + `generateMetadata`
5. แก้ `toBackHref` (§3.2)
6. ตรวจ: `bunx prettier --write` ไฟล์ที่แตะ →
   `bunx next typegen && bunx tsc --noEmit -p .` → `bun run build` → เปิด `start:dev`
   เทียบกับดีไซน์ที่ 1920px และมือถือ (390px) รวมถึงลอง season ที่ไม่มีตอน / มี season
   เดียว

## 8. คำถาม (ค่าในวงเล็บคือสิ่งที่จะทำถ้าไม่ได้คำตอบ)

1. **Sidebar** แสดง season ปัจจุบันด้วยไหม (แบบไฮไลต์) หรือตัดออกตามดีไซน์? _(ตัดออก)_
2. **ข้อความใต้ `EP 01`** ในดีไซน์เป็นชื่อเรื่อง — จริง ๆ ควรเป็นชื่อตอนใช่ไหม? _(ชื่อตอน
   ถ้าไม่มีใช้ `Episode 1`)_
3. **Kind** ในดีไซน์เขียน `Anime Series` แต่ `KIND_LABELS` ของ browse เป็น `Anime` —
   จะเปลี่ยนเป็นชื่อยาวทั้งสองหน้า หรือให้หน้านี้ใช้ชื่อยาวแยก? _(เพิ่ม map ชื่อยาวแยก ให้
   chip บนการ์ด browse สั้นเหมือนเดิม)_
4. **Chip ชนิด season** ใช้ `Season` / `Special` / `The Movie` / `Spinoff`
   ตามดีไซน์เลยไหม? _(ตามดีไซน์)_ → **ตอบแล้ว:** สีแยกตาม `season.kind`: season = `theme`,
   special = orange, spinoff = indigo, movie = blue (ข้อความตามดีไซน์)
5. **ชื่อเต็มของ season** ถ้า season มี `title` ของตัวเอง (เช่น spinoff) ใช้ `title`
   นั้นแทน `<content> <Season N>` ใช่ไหม? และ content ที่มีแค่ Season 1 ยังโชว์ `Season 1`
   ต่อท้ายไหม? _(ใช้ `title` ถ้ามี · โชว์ `Season 1` เสมอ)_
6. **Watch progress / ปุ่ม Continue** ดีไซน์ไม่มี — งานนี้ยังไม่ทำใช่ไหม? _(ไม่ทำ
   ไว้เป็นงานถัดไป)_ → **ตอบแล้ว:** ไม่ทำปุ่ม Continue แต่ใส่ `PlaySquareIcon` หน้า
   `EP 00` ของตอนที่ดูค้างไว้ (§2.4)

ข้อ 1, 2, 3, 5 ใช้ค่าในวงเล็บ

## 9. สิ่งที่ต่างจากแผนตอนลงมือทำ

- `SEASON_KIND_LABELS`, สี chip ตาม kind และ `KIND_FULL_LABELS` (`Anime Series`) อยู่ใน
  `utils.ts` ของ route ไม่ได้อยู่ใน `@/constants/labels` เพราะใช้แค่หน้านี้ (start local)
  ส่วนที่ย้ายเป็น shared จริงคือ `SOURCE_LABELS`, `STATUS_LABELS`, `SEASONAL_LABELS` (→
  `@/constants/labels`), `SEASONALS` / `Seasonal` (→ `@/constants`), `pad2` (→
  `@/libs/utils`) และ `airedLabel` ใหม่ใน `@/libs/season`
- `KIND_LABELS` ยังอยู่ใน `browse/utils.ts` เพราะใช้แค่ browse
- `description` ของ metadata ใช้ synopsis เต็ม ไม่ได้ตัดสั้น
- `readSeasonDetail` ใช้ `inArray(contentId, subquery)` (id เป็น unique จึงได้ผลเท่ากับ
  `=`)
- `bun run build` ยังไม่ผ่านเพราะ type error เดิม 4 จุดที่ไม่เกี่ยวกับงานนี้ (`"original"`
  ใน `browse/actions/read.ts`, `read-filters.ts` และ `ReadableStream` cast ใน `api/art`,
  `api/stream`)
- เพิ่ม `SeasonBreadcrumbs` (`Home > Browse > <content title>`) บนสุดของหน้า:
  ชื่อเรื่องคือหน้าปัจจุบัน ไม่มีลิงก์ ตัดที่ `max-w-2xs` และมี tooltip
  `placement='bottom'` · ใช้ function children ของ `Breadcrumbs.Item` แล้ววาด separator
  เอง เพราะ item ที่มี `href` ของ HeroUI เป็น `<a>` ธรรมดา (ไม่มี `RouterProvider`)
  ซึ่งโหลดหน้าใหม่ทั้งหน้าและข้าม loader bar
