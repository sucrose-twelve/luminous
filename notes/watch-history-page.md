# Watch History Page (`/watch-histories`) — แผนงาน

> เขียนเมื่อ 2026-10-21 · แก้ไขรอบ 3 (ยืนยัน §10.2 แล้ว) · สถานะ: เสร็จแล้ว (ดู §12) ·
> ยังไม่ได้เปิดดูหน้าจริงในเบราว์เซอร์
>
> ดีไซน์อ้างอิง: `docs/design/watch-history/00-list-view.png` (list) และ
> `docs/design/watch-history/01-grid-view.png` (grid) กว้างประมาณ 1280px

## 0. Context

`watch_histories` มีข้อมูลแล้ว: player ส่ง beacon ไป `POST /api/progress` ซึ่ง upsert **1
แถวต่อ 1 account ต่อ 1 content** (`episode_id`, `position_seconds`, `duration_seconds`,
`completed_at` เมื่อดูถึง 90 %, `watched_at`) แต่ยังไม่มีหน้าไหนแสดง ข้อมูลนี้ทั้งหมด
มีแค่ `readProgress` (หน้า watch) กับ `readResumeEpisodeId` (หน้า content)

`NAV_LINKS` ใน `constants/navigation.ts` เขียนไว้แล้วว่า "add My List and History when
their pages are built"

**เป้าหมาย**: หน้า `/watch-histories` ของ account ที่ sign-in อยู่ มี 2 มุมมอง (grid /
list) กรองตามชนิดกับสถานะ เรียงได้ แบ่งหน้า ลบรายการได้ (มี modal ยืนยัน) render แบบ plain
SSR และใช้ได้ทั้ง desktop และมือถือ

### 0.1 ต่างจากดีไซน์ (ตามที่เจ้าของโปรเจกต์สั่ง)

| ในดีไซน์                         | ในงานนี้                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| ปุ่ม favorite รูปหัวใจ           | **ตัดออก** ไม่อ่าน `watchlists.is_favorite`                                                  |
| ปุ่มแก้ไขความคืบหน้า (ดินสอ)     | **แทนด้วยปุ่มลบ** ที่ตำแหน่งเดิม กดแล้วเปิด modal ยืนยัน (§5)                                |
| ปุ่ม "จบแล้ว / รับชมแล้ว"        | **ตัดออก** รายการ `completed` ไม่มีปุ่มหลัก เหลือแค่ปุ่มลบ                                   |
| สีม่วง / คราม / เขียว            | **ใช้สีธีมของแอป** (`theme`, `#05d6a2`)                                                      |
| chip หลายสี (ชนิด, สถานะ, genre) | **chip ทุกอันเป็น `variant='primary'`** (สีเริ่มต้นของ HeroUI ไม่ใส่ `color` / className สี) |
| ข้อความไทยปนอังกฤษ               | **อังกฤษทั้งหมด** (§6.4)                                                                     |
| Dub badge                        | ไม่แสดง (`watch_histories` ไม่เก็บ track อยู่แล้ว)                                           |

## 1. สิ่งที่อ่านได้จากดีไซน์

### 1.1 แถบเครื่องมือด้านบน (การ์ดมุมมน ขอบบาง ทั้ง 2 มุมมองเหมือนกัน)

| ส่วน        | รายละเอียด                                                                   | URL param                                             |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| Kind tabs   | **`All` อันแรก** (ไอคอน sparkles) → `Anime` → `Series` → `Movies` พร้อมไอคอน | `kind` = `anime` \| `series` \| `movie` (ไม่มี = All) |
| Status      | segmented control: `All`, `Watching`, `Completed`, `On Hold`                 | `status` = `watching` \| `completed` \| `on_hold`     |
| Sort        | dropdown `Sort: Recently Watched ⌄`                                          | `sort`                                                |
| View toggle | ปุ่มไอคอน grid / list                                                        | `view` = `grid` \| `list`                             |

### 1.2 List view — 1 แถวต่อ 1 content

| ส่วน         | รายละเอียด                                                                                     | ข้อมูลจาก                                                              |
| ------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Thumbnail    | ~112×80 มุมมน, chip ชนิดมุมซ้ายบน                                                              | thumbnail ของตอนที่แสดง (fallback poster ของ season) · `contents.kind` |
| ชื่อ         | `Frieren: Beyond Journey's End` ตัวหนา                                                         | `contents.title`                                                       |
| ชื่อรอง      | `葬送のフリーレン` สีเทา                                                                       | `contents.altTitles.JP ?? .EN` (ซ่อนถ้าซ้ำกับชื่อหลัก)                 |
| แถวตอน       | `Season 1 • Episode 24` สีธีม + ` - "Perfect Magic"` + `•` + ไอคอนนาฬิกา `18:42 / 24:00`       | `seasonName()`, `episodeTag()` / `episodeTitle()`, position/duration   |
| หนัง         | `Full Feature Film` แทนแถว season/episode                                                      | `contents.kind === "movie"`                                            |
| Progress bar | เต็มความกว้าง สีธีม + `%` ชิดขวา                                                               | `position / duration`                                                  |
| คอลัมน์ขวา   | บน: ปุ่ม `Remove` (outline, ไอคอนถังขยะ — แทน "แก้ไข") · ล่าง: `Continue` (สีธีม + ไอคอน play) | completed: มีแค่ `Remove`                                              |

### 1.3 Grid view — 4 คอลัมน์ที่ ~1280px

| ส่วน           | รายละเอียด                                                                                                         | ข้อมูลจาก                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| ภาพบน          | ~16:10 เต็มความกว้างการ์ด, gradient มืดด้านล่าง, chip ชนิดซ้ายบน                                                   | เหมือน list                                             |
| ล่างซ้ายภาพ    | chip สถานะ (`Currently Watching` / `Completed` / `On Hold`) + `Last watched: 10 mins ago` ฟอนต์ mono               | สถานะที่คำนวณ (§2.3) · `watched_at`                     |
| ชื่อ + ชื่อรอง | เหมือน list                                                                                                        |                                                         |
| กล่องตอน       | กรอบมน: `Season 1 • Episode 24` ซ้าย + `18:42 / 24:00` ขวา (mono), บรรทัด `Episode: "Perfect Magic"`, progress bar | หนัง: `Full Feature Film` ไม่มีบรรทัด `Episode:`        |
| Genre chips    | chip เล็ก (`Fantasy`, `Adventure`, …)                                                                              | `contents.genres` → label จาก `@/constants/data/genres` |
| แถวล่าง        | เส้นคั่น + `Continue` เต็มความกว้าง + ปุ่มลบไอคอนอย่างเดียว (ตำแหน่งปุ่มดินสอเดิม)                                 | completed: เส้นคั่น + ปุ่มลบชิดขวาอย่างเดียว            |

## 2. Data — `actions/read.ts` (route-local)

reader ที่เรียกจาก Server Component เท่านั้น จึง**ไม่ใส่ `"use server"`** (แบบเดียวกับ
`watch/actions/read.ts`) และห่อด้วย `withAuth` ข้อมูลเป็นของผู้ใช้แต่ละคน จึง**ไม่ cache**
(ตาม performance.md: per-user data ให้ query ตรงและใช้ index ให้ถูก)

### 2.1 `readWatchHistories(input)`

`withAuth(async (account, input: unknown) => …)` → validate ด้วย `historyValidator`
(`validator.zod.ts`) → ได้ `{ ok: true, data: Pagination<HistoryRow> }` หรือ
`{ ok: false, errors }` เหมือน `readBrowse`

query หลัก (ครั้งเดียว ไม่มี N+1):

```
watch_histories wh
  inner join episodes e  on e.id = wh.episode_id
  inner join seasons  s  on s.id = e.season_id
  inner join contents c  on c.id = wh.content_id
  left join lateral (<ตอนถัดไป §2.2>) n on true
where wh.account_id = $account
  and <kind filter> and <status filter>
order by <sort>, wh.id
limit/offset
```

columns ที่ select (ไม่มี path ไฟล์หลุดออกไป):

- history: `id, positionSeconds, durationSeconds, completedAt, watchedAt`
- episode (ตอนที่บันทึกไว้): `id, episodeNo, kind, title, hasThumbnail`
  (`thumbnail_path is not null`)
- season: `id, kind, seasonNo, title`
- content: `id, kind, title, altTitles, genres`
- `next`: ตอนถัดไปจาก lateral (§2.2) — `null` ได้
- `status`: คำนวณใน SQL (§2.3) เพื่อให้กรองใน DB ได้เลย

นับ `count()` ขนานกับ query หน้าใน `Promise.all` และ clamp หน้าที่เกินแบบ `readBrowse`

### 2.2 ตอนถัดไป (lateral subquery)

ต้องใช้เมื่อ**ตอนที่บันทึกไว้ดูจบแล้ว** (`wh.completed_at is not null`) เท่านั้น
ใส่เงื่อนไข นี้ไว้ใน lateral เพื่อไม่ต้องหาให้แถวที่ยังดูไม่จบ

ลำดับตอนต้องตรงกับ `readContentEpisodes`
(`seasons.releasedOn, seasons.createdAt, seasons.id, episodes.episodeNo`) จึงเทียบด้วย row
value และต้องมี track อย่างน้อย 1 อัน (ไม่งั้นหน้า watch จะขึ้น not-found):

```sql
select e2.id, e2.episode_no, e2.kind, e2.title,
       e2.thumbnail_path is not null as has_thumbnail,
       s2.id as season_id, s2.kind as season_kind, s2.season_no, s2.title as season_title,
       t2.duration_seconds
from episodes e2
join seasons s2 on s2.id = e2.season_id
join lateral (
  select duration_seconds from tracks
  where episode_id = e2.id
  order by is_dubbed, language
  limit 1
) t2 on true
where wh.completed_at is not null
  and s2.content_id = wh.content_id
  and (s2.released_on, s2.created_at, s2.id, e2.episode_no)
    > (s.released_on, s.created_at, s.id, e.episode_no)
order by s2.released_on, s2.created_at, s2.id, e2.episode_no
limit 1
```

- ความยาวของตอนถัดไปเอาจาก track ต้นฉบับ (เรียงแบบเดียวกับ `pickTrack` fallback) ใช้แสดง
  `00:00 / 24:00`
- ใช้ index ที่มีอยู่แล้ว (`seasons_content_released_on_index`,
  `episodes_season_episode_no_index`, `tracks_episode_language_index`) → **ไม่ต้อง
  migrate**
- ต้องเช็กตอนลงมือว่า Drizzle 1.0 rc มี `leftJoinLateral` / `innerJoinLateral` — ถ้าไม่มี
  ใช้ `sql` subquery แทน

### 2.3 สถานะ (คำนวณ ไม่ได้เก็บ)

`completed_at` ใน DB หมายถึง "ตอนนี้ดูจบ" ไม่ใช่ "ทั้งเรื่องจบ" สถานะของหน้านี้จึงคำนวณ:

| สถานะ       | เงื่อนไข                                            | ตอนที่แสดง            | ปุ่ม              |
| ----------- | --------------------------------------------------- | --------------------- | ----------------- |
| `completed` | `completed_at is not null` **และ** ไม่มีตอนถัดไป    | ตอนที่บันทึกไว้ 100 % | Remove            |
| `on_hold`   | ไม่ใช่ completed และ `watched_at < now() - 30 days` | ตามแถวล่าง            | Continue + Remove |
| `watching`  | ที่เหลือทั้งหมด                                     | ตามแถวล่าง            | Continue + Remove |

ตอนที่แสดงของ `watching` / `on_hold`:

- **ยังดูตอนไม่จบ** → ตอนที่บันทึกไว้ ที่ `position_seconds` · ลิงก์
  `/watch?vid=<episodeId>` (ไม่ใส่ `audio` ให้ `pickTrack` ใช้ preference และหน้า watch
  เริ่มที่ `position_seconds` เอง)
- **ดูตอนจบแล้วและมีตอนถัดไป** → **แสดงตอนถัดไปที่ 0 %** (`00:00 / <duration>`, ภาพ
  thumbnail ของตอนถัดไป, season ของตอนถัดไป) · ลิงก์ `/watch?vid=<next.id>`

**On Hold** มีทั้งสถานะและแท็บ แต่**ยังไม่มี action** ให้ผู้ใช้ตั้งเอง ใช้กฎ 30 วันข้างบน
อย่างเดียว (`ON_HOLD_AFTER_DAYS = 30` ใน `utils.ts`, ใน SQL ใช้
`make_interval(days => …)`)

### 2.4 ตัวกรอง & การเรียง

- `kind` (`HISTORY_KINDS` ใน `utils.ts`): `anime` → `contents.kind = 'anime_series'` ·
  `series` → `in ('tv_series', 'series', 'shows')` · `movie` → `= 'movie'` · ไม่มีค่า =
  All
- `status`: กรองด้วย expression เดียวกับ §2.3
- `sort`:
  - `recent` (default, "Recently Watched") → `watched_at desc` — ตรง index
    `(account_id, watched_at desc)`
  - `oldest` ("Oldest Watched") → `watched_at asc`
  - `title` ("Title A–Z") → `contents.title asc`
  - ทุกแบบปิดท้ายด้วย `wh.id` ให้ offset pagination ไม่ซ้ำ/ไม่ข้าม

### 2.5 Pagination

1 แถวต่อ content แปลว่าจำนวนแถวสูงสุด = จำนวน content ใน catalogue (ไม่โตไม่จำกัดแบบ event
log) จึงใช้ **offset pagination** แบบหน้า browse, `take = 24` (grid 4 × 6) แทน keyset ที่
performance.md แนะนำสำหรับ list ที่โตเรื่อย ๆ — keyset ใช้กับเลขหน้าไม่ได้และ sort
หลายแบบทำ cursor ยาก

### 2.6 ลำดับใน page

```ts
const query = queryValidator.parse(await searchParams)
const result = await readWatchHistories(query)
```

มี query เดียว (`withAuth` อ่าน session ก่อน — ถ้าไม่มี session จะ redirect `401` ผ่าน
`ErrorBoundary` เหมือนหน้า watch) แล้ว map แถวเป็น view model ใน `utils.ts`
(`toHistoryItem`) ฝั่ง server: เลือกตอนที่แสดง (§2.3), เปอร์เซ็นต์, `18:42 / 24:00`,
`10 mins ago`, ลิงก์ Continue → ส่งเป็นค่าสำเร็จรูปให้ component

`watchedAgo` ใช้ `formatDistanceToNowStrict` ของ date-fns และคำนวณบน server เท่านั้น
(ไม่ให้ client คำนวณซ้ำแล้ว hydrate ไม่ตรงเพราะเวลาเลื่อน) — `new Date()` ใช้ได้เพราะอยู่
หลัง `cookies()` แล้ว (Cache Components)

## 3. ลบรายการ — `actions/delete.ts` (route-local)

```ts
"use server"

export const deleteWatchHistory = withAuth(async (account, input: unknown) => {
  ...deleteValidator.safeParse(input) → { ok: false, errors }
  ...db.delete(watchHistories)
       .where(and(eq(id, parsed.id), eq(accountId, account.id)))
       .returning({ id })
  ...ไม่มีแถว → { ok: false, errors: { id: ["Not found"] } }
  refresh()
  return { ok: true as const }
})
```

- `deleteValidator = z.object({ id: z.uuid() })` ใน `validator.zod.ts`
- เช็กเจ้าของใน `where` (`account_id = account.id`) — ลบของคนอื่นด้วย id ที่เดามาไม่ได้
- ไม่มี cache tag ต้อง invalidate: `readProgress`, `readResumeEpisodeId` และ reader
  ของหน้านี้ ไม่ได้ cache · `refresh()` (แบบ `updatePlaybackPreference`) ให้หน้า render
  ใหม่ และ clamp หน้าเองถ้าลบแถวสุดท้ายของหน้าสุดท้าย
- ผลข้างเคียงที่ตั้งใจ: ความคืบหน้าที่บันทึกของ content นั้นหายไปด้วย (หน้า watch
  จะเริ่มที่ 0, หน้า content ไม่มีไอคอน "ดูค้างไว้") ถ้าดูใหม่ beacon จะสร้างแถวใหม่เอง

## 4. URL state — `validator.nuqs.ts` + hook

```ts
export const historyParsers = {
  page: parseAsInteger.withDefault(1),
  kind: parseAsStringLiteral(HISTORY_KINDS),
  status: parseAsStringLiteral(HISTORY_STATUSES),
  sort: parseAsStringLiteral(HISTORY_SORTS).withDefault("recent"),
  view: parseAsStringLiteral(HISTORY_VIEWS).withDefault("grid")
}
```

`hooks/use-history-query.ts` แบบเดียวกับ `useBrowseQuery`: `shallow: false` +
`startTransition` + loader bar, เปลี่ยนตัวกรองแล้วกลับหน้า 1

**`view` ก็ render บน server** (ไม่ใช่สลับฝั่ง client): การ์ดทั้งสองแบบจึงเป็น Server
Component ไม่ต้องส่ง JS ของการ์ด (ยกเว้นปุ่มลบ) แลกกับ round-trip ตอนสลับมุมมองซึ่ง query
ถูกอยู่แล้ว ตอนสลับ `view` ไม่ reset `page`

## 5. ไฟล์ที่จะสร้าง / แก้

```
src/app/(protected)/(site)/
├── layout.tsx                         ใหม่: header + footer เหมือน (public) (ใช้ SiteShell)
└── watch-histories/
    ├── page.tsx                       Server Component: parse params → readWatchHistories → compose
    ├── actions/
    │   ├── read.ts                    readWatchHistories (§2)
    │   └── delete.ts                  deleteWatchHistory (§3)
    ├── components/
    │   ├── history-toolbar.tsx        การ์ดแถบบน: จัด layout ของ 4 control (server)
    │   ├── kind-tabs.tsx              "use client" — ToggleButtonGroup (single, disallowEmptySelection), All อันแรก
    │   ├── status-tabs.tsx            "use client" — ToggleButtonGroup แบบ segmented
    │   ├── sort-select.tsx            "use client" — Select มี prefix "Sort:"
    │   ├── view-toggle.tsx            "use client" — ToggleButtonGroup ไอคอน grid/list
    │   ├── history-grid-card.tsx      การ์ด grid (server)
    │   ├── history-list-item.tsx      แถว list (server)
    │   ├── history-thumbnail.tsx      ภาพ + chip ชนิด (+ chip สถานะ / Last watched ใน grid)
    │   ├── history-progress.tsx       ProgressBar ของ HeroUI สีธีม + aria-valuetext
    │   ├── continue-link.tsx          ปุ่ม Continue = Link + buttonVariants, prefetch={false}
    │   ├── remove-button.tsx          "use client" — ปุ่มลบ + AlertDialog ยืนยัน (§5.2)
    │   └── history-empty.tsx          สถานะว่าง (§7)
    ├── hooks/use-history-query.ts
    ├── utils.ts                       constants, toHistoryItem, watchedAgo, labels
    ├── validator.nuqs.ts
    └── validator.zod.ts               historyValidator, deleteValidator
```

เหตุผลที่ใช้ nested route group `(protected)/(site)/`: หน้า watch ต้องไม่มี header/footer
แต่หน้า protected อื่นที่จะตามมา (`/my-list`, `/settings`) ต้องมี จึงให้กลุ่ม `(site)` ถือ
chrome ไว้

### 5.1 ย้ายของที่จะมี 2 route ใช้ขึ้นเป็น shared (ย้าย ไม่ copy)

| ของ                                                            | จาก                             | ไป                                                                                                                          |
| -------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| เนื้อหา `(public)/layout.tsx` (store + header + main + footer) | `(public)/layout.tsx`           | `@/components/site-shell.tsx` (`SiteShell({ account, children })`) ทั้งสอง layout เรียกใช้                                  |
| `BrowsePagination` + `pageNumbers`                             | `browse/components`, `utils`    | `@/components/pagination.tsx` รับ `onChange(page)` + `isPending` แทนการผูกกับ `useBrowseQuery` (browse ส่ง `update` เข้าไป) |
| `toPagination`, `lastPageOf`                                   | `browse/utils.ts`               | `@/drizzle/utils.ts` (อยู่คู่ `withPagination`)                                                                             |
| `KIND_LABELS`                                                  | `browse/utils.ts`               | `@/constants/labels.ts`                                                                                                     |
| `formatTime`, `formatSpokenTime`                               | `watch/components/lmp/utils.ts` | `@/libs/time.ts` (ใช้ทำ `18:42 / 24:00` และ `aria-valuetext`)                                                               |

### 5.2 `remove-button.tsx` — ปุ่มลบ + modal ยืนยัน

- เป็น client leaf ตัวเดียวในการ์ด รับแค่ `{ id, title }`
- ปุ่ม: list = outline ไอคอน `Delete02Icon` + `Remove` · grid = icon-only (`aria-label`
  `Remove <title> from history`)
- ใช้ **`AlertDialog`** ของ HeroUI v3 (dialog สำหรับยืนยัน มี focus trap + Esc) — ไม่ใช้
  `ModalComponent` ใน `@/components/ui/modal` เพราะตัวนั้นปิดการกด backdrop/Esc ไว้
  ซึ่งไม่ เหมาะกับการยืนยันที่ควรยกเลิกง่าย
  - Icon `status='danger'` · Heading `Remove from watch history?`
  - Body `<title> and its saved progress will be removed. This can't be undone.`
  - Footer: `Cancel` (`variant='tertiary'`, `slot='close'`) · `Remove`
    (`variant='danger'`, แสดง pending ระหว่างรอ)
- กด Remove → `useTransition` เรียก `deleteWatchHistory({ id })` → `ok` ปิด dialog (หน้า
  refresh เองจาก `refresh()`) · ไม่ `ok` แสดงข้อความ error ใน body และไม่ปิด dialog
- dialog ปิดอยู่ไม่ render เนื้อหา จึงไม่มีปัญหาที่มีปุ่มลบ 24 อันต่อหน้า

### 5.3 ทางเข้าหน้า

- เพิ่มรายการ `Watch History` (ไอคอน clock) ใน `AccountMenu` เหนือ Sign out — มีเฉพาะคน
  ที่ sign-in แล้ว
- `NAV_LINKS` ไม่เพิ่ม เพราะคนที่ไม่ได้ sign-in กดแล้วจะเจอ 401

## 6. Layout, สี & ข้อความ

### 6.1 Responsive

| ช่วง      | Toolbar                                                   | Grid      | List                                                                                |
| --------- | --------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------- |
| `< sm`    | 2 แถว: kind tabs (เลื่อนแนวนอนได้) / status + sort + view | 1 คอลัมน์ | thumbnail เล็ก (`w-24`), ปุ่ม Continue + Remove ย้ายลงใต้ progress bar เป็นแถวเดียว |
| `sm`–`lg` | 2 แถว                                                     | 2 คอลัมน์ | แบบดีไซน์ ปุ่มชิดขวา                                                                |
| `lg`–`xl` | แถวเดียวตามดีไซน์ (`justify-between`)                     | 3 คอลัมน์ | แบบดีไซน์                                                                           |
| `≥ xl`    | แถวเดียว                                                  | 4 คอลัมน์ | แบบดีไซน์                                                                           |

- กรอบหน้า `max-w-8xl mx-auto px-4 py-8` แบบหน้า browse · ดีไซน์ไม่มีหัวข้อหน้า จึงใส่
  `<h1 className='sr-only'>Watch History</h1>`
- ภาพ: `next/image` `fill` ใน `aspect-video` (grid) / `aspect-[7/5]` (list) พร้อม `sizes`
  ตามคอลัมน์, `quality={75}`, lazy ทั้งหมด (ไม่มี hero จึงไม่ใช้ `preload`)
- การ์ดใน grid สูงเท่ากัน (`flex flex-col` + ส่วน genre `grow`)
- ชื่อเรื่องและชื่อตอนเป็น `line-clamp-1` + `title` attr
- ชื่อเรื่อง/ภาพเป็นลิงก์ไปหน้า season ของตอนที่แสดง (`/content/<seasonId>`,
  `prefetch={false}`)

### 6.2 สี (ธีมของแอป)

- ปุ่ม Continue: สีธีม (`bg-theme text-background` แบบปุ่ม active ของ pagination)
- Progress fill: `bg-theme` ทุกสถานะ (completed ก็ 100 % สีธีม) · track `bg-foreground/10`
- แถว `Season 1 • Episode 24` และ kind tab / status / view ที่ active: สีธีม
- ปุ่ม Remove: outline เทา, hover เป็นสี `danger`

### 6.3 Chip

ทุก chip (ชนิด, สถานะ, genre) ใช้ `<Chip variant='primary' size='sm'>` ไม่ใส่ `color` และ
ไม่ override สีด้วย className

### 6.4 ข้อความ (อังกฤษทั้งหมด)

| ที่                    | ข้อความ                                                       |
| ---------------------- | ------------------------------------------------------------- |
| Kind tabs              | `All`, `Anime`, `Series`, `Movies`                            |
| Status                 | `All`, `Watching`, `Completed`, `On Hold`                     |
| Sort                   | `Sort:` + `Recently Watched` / `Oldest Watched` / `Title A–Z` |
| View toggle            | `aria-label`: `Grid view`, `List view`                        |
| Chip สถานะ             | `Currently Watching`, `Completed`, `On Hold`                  |
| Chip ชนิด              | `KIND_LABELS` (`Anime`, `TV Series`, `Movie`, …)              |
| เวลาที่ดูล่าสุด (grid) | `Last watched: 10 mins ago`                                   |
| ชื่อตอน (grid)         | `Episode: "Perfect Magic"`                                    |
| หนัง                   | `Full Feature Film`                                           |
| ปุ่ม                   | `Continue`, `Remove`                                          |

## 7. Edge cases

| กรณี                                    | ทำอะไร                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| ยังไม่เคยดูอะไร (ไม่มีตัวกรอง)          | `history-empty`: `No watch history yet` + ลิงก์ `Browse contents` และซ่อน toolbar |
| มีประวัติแต่ตัวกรองไม่เจอ               | `No history matches these filters` + ลิงก์ `Clear filters` (คง `view` ไว้)        |
| ไม่ได้ sign-in                          | `withAuth` → redirect `401` (เหมือนหน้า watch)                                    |
| ตอนไม่มี thumbnail                      | ใช้ poster ของ season (`object-cover`)                                            |
| ไม่มี `altTitles.JP/EN` หรือซ้ำชื่อหลัก | ไม่แสดงบรรทัดชื่อรอง                                                              |
| episode เป็น special/OVA                | ใช้ `episodeTag()` / `episodeTitle()` จาก `@/libs/episode` แทน `Episode N`        |
| ชื่อตอนเป็นแค่เลข (`01`)                | `episodeTitle()` คืน `null` → ไม่แสดง ` - "…"` / บรรทัด `Episode:`                |
| `durationSeconds = 0`                   | เปอร์เซ็นต์ = 0 (กันหารศูนย์)                                                     |
| หน้าเกินหน้าสุดท้าย (รวมหลังลบ)         | clamp แบบ `readBrowse`                                                            |
| ตอนถัดไปมีแต่ยังไม่มี track             | ไม่นับเป็นตอนถัดไป → ถ้าจบตอนสุดท้ายที่เล่นได้แล้ว = `completed`                  |
| ลบ id ที่ไม่ใช่ของตัวเอง / ถูกลบไปแล้ว  | action คืน `{ ok: false }` → dialog แสดง error                                    |

## 8. Metadata

`export const metadata: Metadata = { title: "Watch History" }` และ
`export const instant = false` (page อ่าน session)

## 9. ลำดับการทำ & การตรวจ

1. ย้ายของ shared ตาม §5.1 แล้ว `bun run build` ให้หน้า browse / watch ยังผ่านเหมือนเดิม
2. `(protected)/(site)/layout.tsx` + `SiteShell`
3. validators + `actions/read.ts` (lateral ตอนถัดไป + สถานะ) — ดู `EXPLAIN` ว่าใช้ index
   `(account_id, watched_at desc)`
4. `actions/delete.ts`
5. `utils.ts` (`toHistoryItem`, `watchedAgo`, constants)
6. components: thumbnail / progress / continue-link / remove-button → list item → grid
   card → toolbar controls → empty
7. `page.tsx` + pagination + ลิงก์ใน `AccountMenu`
8. ตรวจ: `bunx prettier --write` ไฟล์ที่แตะ, `bun run build`, เปิด `/watch-histories` ด้วย
   `user@luminous.co` ทั้ง grid/list, ทุกตัวกรอง, จอมือถือ, ลบรายการ (ยกเลิก / ยืนยัน),
   และ หลังดูตอนจบ (90 %) ว่าแสดงตอนถัดไปที่ 0 % / ตอนสุดท้ายเป็น Completed —
   ต้องมีประวัติจริง ในเครื่องก่อน (ดูวิดีโอสักสองสามเรื่องจากหน้า watch)

## 10. การตัดสินใจ

### 10.1 ตอบแล้ว (รอบ 1)

| เรื่อง                   | คำตอบ                                             |
| ------------------------ | ------------------------------------------------- |
| สี                       | ใช้สีธีมของแอป · chip ทั้งหมด `variant='primary'` |
| On Hold                  | เก็บสถานะและแท็บไว้ ยังไม่ต้องมี action           |
| ภาษา UI                  | อังกฤษทั้งหมด                                     |
| ดูจบตอนแล้วแต่มีตอนต่อไป | แสดงตอนถัดไปที่ 0 %                               |
| Kind tabs                | มี `All` อันแรก                                   |
| Route                    | `(protected)/(site)/watch-histories`              |
| ลบออกจากประวัติ          | ปุ่มลบแทนที่ปุ่มแก้ไข + modal ยืนยัน              |
| Dub badge                | ไม่แสดง                                           |

### 10.2 ค่าเริ่มต้น (ยืนยันแล้วทั้งหมด รอบ 2)

- On Hold คำนวณจาก "ไม่ได้ดูเกิน 30 วันและยังไม่จบ" (ไม่ต้องมี action ใด ๆ)
- Kind: `Anime` = `anime_series`, `Series` = `tv_series` + `series` + `shows`, `Movies` =
  `movie`
- Sort: Recently Watched (default), Oldest Watched, Title A–Z
- ทางเข้า: เมนู account อย่างเดียว ไม่ใส่ `NAV_LINKS`
- กดชื่อ/ภาพไปหน้า season
- มุมมองเริ่มต้น `grid` ไม่จำค่าข้ามการเข้าหน้า (อยู่ใน URL เท่านั้น)
- รายการ completed ยังมีปุ่ม Remove (ตัดแค่ปุ่ม "รับชมแล้ว")

## 11. ข้อเสนอเพิ่มเติม (ตัดสินใจแล้ว: ยังไม่ทำทั้งสองข้อ)

- **แถว "Continue Watching" ในหน้าแรก** ใช้ reader เดียวกัน (กรอง `watching`, `take = 10`)
  — ถ้าทำ ให้ย้าย `readWatchHistories` ขึ้นไป `@/actions/watch-history/read.ts`
- **ตั้ง On Hold เอง** ภายหลัง: เก็บใน `watchlists.status` แล้วให้ค่าที่ตั้งเองชนะกฎ 30
  วัน

## 12. สิ่งที่ต่างจากแผนตอนลงมือทำ

- **Pager**: ย้ายไปเป็น `@/components/pager.tsx` (`Pager`) แทนชื่อ `pagination.tsx`
  เพราะชื่อ `Pagination` ชนกับ component ของ HeroUI · หน้า browse / history มี wrapper
  เล็ก ๆ (`browse-pagination.tsx`, `history-pagination.tsx`) ที่ต่อ `Pager` เข้ากับ query
  hook ของ ตัวเอง และ `pageNumbers` ย้ายตามเข้าไปในไฟล์ `pager.tsx`
- **Genre**: `genreText` ย้ายจาก `content/[seasonId]/utils.ts` ไป `@/libs/genre.ts` · chip
  genre แสดงแบบหน้า content (`Action (ต่อสู้)`) ตามที่เจ้าของโปรเจกต์ขอ — เป็นข้อยกเว้น
  เดียวของ "อังกฤษทั้งหมด"
- **`next` จาก lateral join**: Drizzle ไม่ได้คืน `null` ให้ object ที่ field มาจาก
  subquery ที่ left join แต่คืน object ที่ทุก field เป็น `null` — reader จึงแปลงเป็น
  `null` เองก่อนส่งออก (เจอตอนรัน query กับข้อมูลจริง: รายการ completed เคยแสดง
  `undefined • undefined`)
- **AlertDialog**: ค่าเริ่มต้นของ HeroUI ปิดการกด backdrop / `Esc` ไว้
  จึงเปิดให้กดยกเลิกได้เอง (`isDismissable`, `isKeyboardDismissDisabled={false}`)
  ยกเว้นระหว่างกำลังลบ
- **ทางเข้าหน้า**: เมนู account ใช้ `router.push` + `loader.on()` (รายการใน
  `Dropdown.Menu` ไม่ใช่ `Link`)
- **การตรวจ**: `tsc` และ `bun run build` ผ่าน · query ถูกรันกับ DB จริงแบบอ่านอย่างเดียว
  (สถานะทั้ง 3 แบบ, กรองชนิด, ตอนถัดไปที่ 0 %, completed ที่ 100 %) ·
  **ยังไม่ได้เปิดหน้าใน เบราว์เซอร์** เพราะการสร้าง session token ปลอมเพื่อล็อกอินถูกบล็อก
  ต้องลองด้วยการ sign in จริง
