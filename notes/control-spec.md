# Control Panel (`/ctrl`) — Spec

> เขียนเมื่อ 2026-10-27 · รอบ 2 (rewrite จากร่างแรก) · ตอบคำถาม §11 แล้ว · สถานะ:
> ทำครบแล้ว (ดู §13) · `bun run build` ผ่าน
>
> ดีไซน์อ้างอิง (`docs/design/controls/`): `page-layout.png` (โครงหน้า ที่ 1920px),
> `table-head.png` (หัวตาราง), `skip-editer.png` (modal ตั้ง skip), `alt-titles.png` (ช่อง
> alternative titles ในฟอร์ม content)

Control Panel คือหน้าผู้ดูแล (admin panel) แยกเป็นไฟล์ตามหน้า:

| ไฟล์                                            | ครอบคลุม                                                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [content-page.md](control-spec/content-page.md) | `/ctrl/contents`, `/ctrl/contents/[contentId]`, modal สร้าง/แก้ content, modal สร้าง season        |
| [season-page.md](control-spec/season-page.md)   | `/ctrl/seasons`, `/ctrl/seasons/[seasonId]`, หน้า episode, modal แก้ season/episode/thumbnail/skip |
| [account-page.md](control-spec/account-page.md) | `/ctrl/accounts` (read-only)                                                                       |

ไฟล์นี้เก็บกติกาที่ทุกหน้าใช้ร่วมกัน (สิทธิ์ · route · layout · ตาราง · filter · modal ·
cache) ไฟล์ย่อยอ้างกลับมาเป็น `main §N`

## 0. Context

- **เป้าหมาย**: จัดการ catalogue (contents → seasons → episodes → tracks) และดูรายชื่อ
  accounts แทน lab `(labs)/import-content` กับ `(labs)/import-season` ที่ใช้อยู่ตอนนี้ (ลบ
  lab ทั้งสองเมื่อ modal ใน ctrl ใช้งานได้)
- **ของที่มีแล้วให้ใช้ต่อ**: `createContent` / `createSeason` และ `contentValidator` /
  `seasonValidator` (`@/actions/contents/`), `seasonName`, `episodeTitle` / `episodeTag`,
  `languageName`, `primarySource`, `seasonArtDirectory`, `Pager`, `SeasonStatus` และ label
  ทั้งหมดใน `@/constants` (`KIND_LABELS`, `SEASON_KIND_LABELS`, `STATUS_LABELS`,
  `SOURCE_LABELS`, `GENRES`)
- **การนำเข้าไฟล์วิดีโอ** (remux, episodes, tracks, thumbnail, sprite) ยังเป็นงานของ
  `tests/track.spec.ts` ctrl แค่สร้างคำสั่งให้ copy (season-page §2.3)

### 0.1 สิ่งที่เปลี่ยนจากร่างแรก

| ร่างแรก                                             | รอบนี้                                      | เหตุผล                     |
| --------------------------------------------------- | ------------------------------------------- | -------------------------- |
| โฟลเดอร์ `src/app/controls/` + `rewrites` → `/ctrl` | route group `src/app/(controls)/ctrl/`      | §2.1                       |
| `/ctrl/seasons/[seasonId]/episode/[episodeId]`      | `…/episodes/[episodeId]` (พหูพจน์)          | ให้เหมือน segment อื่น     |
| ตรวจสิทธิ์ที่ layout                                | layout + ทุก reader และ action (`withRole`) | §1.2                       |
| ตาราง tracks มี filter + pagination                 | ไม่มีทั้งคู่                                | 1 episode มี track ≤ 5 แถว |
| copy คำสั่ง import ใส่ `--remux --force` ไว้เสมอ    | checkbox เลือก flag (ค่าเริ่มต้นไม่ติ๊ก)    | season-page §2.3           |
| status ของ account = isActive + isVerified          | + `isSuspended`                             | มีใน schema แต่ร่างแรกตกไป |
| chip สี `bg-*-100 text-*-900`                       | โทนมืด `bg-*-500/15 text-*-300`             | แอปเป็น dark-only (§5.6)   |

## 1. สิทธิ์การเข้าใช้

### 1.1 ใครเข้าได้

- เฉพาะ `accounts.role` เป็น `root` หรือ `admin` (เรียกรวมว่า **staff**) เพิ่ม
  `STAFF_ROLES = ["root", "admin"]` ข้าง `ROLES` ใน `@/constants` และ `isStaff(role)`
- อ่าน role จาก `resolveSession` (DB) เสมอ ไม่ใช้ role ใน token
- ไม่ได้ sign-in หรือเป็น `user` → `notFound()` (ไม่บอกว่ามีหน้านี้) staff sign-in ผ่าน
  modal ของหน้า public ตามปกติ แล้ว §1.3 จะพาเข้า `/ctrl` เอง
- `root` กับ `admin` ทำได้เท่ากันใน v1 (Q3) ในอนาคต action ที่จัดการไฟล์บน disk
  (`node:fs`) จะเป็นของ `root` เท่านั้น จึงให้ guard รับรายการ role ได้
  (`withRole(STAFF_ROLES, …)`)

### 1.2 ตรวจที่ไหน — layout อย่างเดียวไม่พอ

| ชั้น                             | ทำอะไร                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `(controls)/layout.tsx`          | `readSessionAccount()` → ไม่ใช่ staff → `notFound()`                                                                             |
| reader ทุกตัวของหน้า ctrl        | ห่อด้วย `withRole(STAFF_ROLES, …)` (ใหม่ใน `@/actions/auth/index.ts`): `withAuth` + เช็ค role → `ErrorBoundary("403 Forbidden")` |
| Server Action ทุกตัวที่แก้ข้อมูล | `withRole(STAFF_ROLES, …)` เช่นกัน                                                                                               |

> ⚠️ ตอนนี้ `createContent` / `createSeason` **ไม่มี guard เลย** ใครที่อยู่ใน LAN
> ก็เรียกได้ งานนี้ต้องห่อ `withRole(STAFF_ROLES, …)` (lab ที่ยังเรียกอยู่จะต้อง sign-in
> เป็น staff ก่อน)

### 1.3 staff ใช้หน้าอื่นนอก `/ctrl` ไม่ได้

- `(public)/layout.tsx` และ `(protected)/(site)/layout.tsx` อ่าน session อยู่แล้ว →
  ถ้าเป็น staff ให้ `redirect("/ctrl/contents")` (ไม่มีต้นทุนเพิ่ม)
- `(protected)/watch/page.tsx` ไม่มี layout ที่อ่าน session → เช็คในหน้าเอง
- sign-in เป็น staff จากหน้าไหนก็ตาม: `signIn` re-render หน้าเดิม → layout redirect เอง
  ไม่ต้อง แก้ `signIn` · sign-out จาก `/ctrl`: `signOut` redirect `/` อยู่แล้ว
- **ไม่บล็อก** Route Handlers: `/api/stream/[vid]` (วิดีโอใน modal thumbnail / skip) และ
  `/api/art/...` (poster, thumbnail) ต้องใช้ได้ ส่วน `/api/progress` ไม่ถูกเรียกเพราะ ctrl
  ไม่ใช้ player (LMP)
- ผลที่ตามมา: คนที่เป็น admin ต้องใช้อีก account (`user`) เพื่อดูวิดีโอ และ
  `watch_histories` / `watchlists` / `preferences` ของ staff จะไม่ถูกใช้

## 2. Routes & โฟลเดอร์

### 2.1 route group แทน rewrites

ใช้ `src/app/(controls)/ctrl/…` ได้ URL `/ctrl/...` ตรง ๆ โดยไม่ต้องมี `rewrites`:

- rewrites ทำให้ทุกหน้าเปิดได้ 2 URL (`/controls/...` และ `/ctrl/...`)
- `RouteContext<"/controls/...">`, typed `href` และ `usePathname()` จะใช้ชื่อคนละชุดกับ
  URL จริง
- ตรงกับ convention เดิม `(public)`, `(protected)`, `(labs)` และ layout ของ group
  เป็นที่ตรวจ สิทธิ์ + shell พอดี

### 2.2 ตาราง route

| Pathname                                        | หน้า                         | Spec            |
| ----------------------------------------------- | ---------------------------- | --------------- |
| `/ctrl`                                         | `redirect("/ctrl/contents")` | —               |
| `/ctrl/contents`                                | รายการ contents              | content-page §1 |
| `/ctrl/contents/[contentId]`                    | content + seasons ของมัน     | content-page §2 |
| `/ctrl/seasons`                                 | seasons ทั้งหมด              | season-page §1  |
| `/ctrl/seasons/[seasonId]`                      | season + episodes            | season-page §2  |
| `/ctrl/seasons/[seasonId]/episodes/[episodeId]` | episode + tracks             | season-page §3  |
| `/ctrl/accounts`                                | accounts (read-only)         | account-page    |

- ID ทุกตัวใน path ผ่าน `z.uuid()` ก่อน query ไม่ผ่านหรือไม่เจอ → `notFound()`
- หน้า episode ต้องเช็คว่า episode อยู่ใน `seasonId` นั้นจริง ไม่ใช่ → `notFound()`
- หน้า detail ทุกหน้ามี breadcrumb เหนือ title (`breadcrumb` ติดตั้งแล้ว) เช่น
  `Contents › Frieren › Season 1 › E01` เพราะเข้าหน้า season จาก `/ctrl/seasons` ได้ด้วย
  เลยต้องมีทางกลับขึ้น content

### 2.3 โครงโฟลเดอร์ (`/browse` pattern)

```
src/app/(controls)/
├── layout.tsx                    เช็ค staff (§1.2) · ControlShell (§4) · screen notice (§3)
├── components/                   ใช้ร่วมเฉพาะใน ctrl: header, tabs, search, data-table, sort-head,
│                                 filter-panel, detail-panel, copy-button, screen-notice
└── ctrl/
    ├── page.tsx                  redirect
    ├── contents/                 page.tsx · actions/read.ts · components/ · utils.ts · validator.nuqs.ts
    │   └── [contentId]/
    ├── seasons/
    │   └── [seasonId]/
    │       └── episodes/[episodeId]/
    └── accounts/
```

- `(controls)/components/` คือ "shared ภายใน group" (ใช้หลาย route แต่เฉพาะใน ctrl) ถ้ามี
  route นอก ctrl ต้องใช้ด้วยค่อยย้ายขึ้น `@/components/`
- Mutations อยู่ shared ตาม domain (ของเดิมก็อยู่ที่นั่น): `@/actions/contents/create.ts`,
  `update.ts` (content + season) และ `@/actions/episodes/update.ts` (episode, skip,
  thumbnail) validator อยู่ `validator.zod.ts` ข้างกัน
- ค่าคงที่ของ ctrl (page sizes, sort ของแต่ละตาราง) อยู่ `@/constants/control.ts`

## 3. หน้าจอ ≥ 1440px

- ใช้ได้เฉพาะ viewport กว้าง ≥ 1440px (Q2)
- server ไม่รู้ความกว้างจอ จึงทำด้วย **CSS ล้วน**: render ทั้ง shell และ notice
  แล้วสลับด้วย breakpoint (`min-[1440px]:`) ย่อหน้าต่างแล้วสลับทันทีโดยไม่ต้องใช้ JS
  และไม่ unmount (ฟอร์มที่กรอกค้างใน modal ไม่หาย)
- notice เป็น `fixed inset-0` และ z-index สูงกว่า dialog เพราะ modal ถูก portal ไปที่
  `body` การซ่อน shell ไม่ได้ซ่อน modal ด้วย
- เปิดจากมือถือ/แท็บเล็ต (ตรวจ user agent แบบ `browserNotice` ของ `/watch`) → render
  notice อย่างเดียว ไม่ query อะไร ตรวจหลัง §1.1 เสมอ (คนที่ไม่ใช่ staff ต้องได้ 404
  ไม่ใช่ notice)
- ข้อความ: **Screen too small** — "The control panel needs a window at least 1440px wide.
  Widen the window or open it on a desktop."

## 4. Layout (`page-layout.png`)

### 4.1 Header — `ControlShell` (ไม่ใช้ `SiteShell` และไม่มี footer)

- แถวบน: logo (`BrandLogo`) ซ้าย → `/ctrl/contents` · ช่องค้นหา + ปุ่ม search กลาง
- แถวล่าง: แท็บ icon + label **Contents · Seasons · Accounts** active = ข้อความขาว +
  ขีดเส้นใต้ เทียบ pathname แบบ prefix (`/ctrl/seasons/...` → Seasons)
- ขวา: ปุ่ม sign-out (icon + tooltip) · ปุ่ม settings (Q4) · avatar + display name + role
  ("Root" / "Admin")
- **Search**: submit → `/ctrl/seasons?search=<text>` ค้น `contents.searchText` และ
  `seasons.title` แบบเดียวกับ browse (ilike + trigram) อยู่หน้า seasons
  แล้วช่องค้นหาแสดงค่า `?search` ปัจจุบัน (Q5)

### 4.2 Page

- container กว้าง ~1420px กลางจอ (ดีไซน์: x 260 → 1680 ที่ 1920)
- **`-L`** grow: breadcrumb (หน้า detail) → h1 title → description 1 บรรทัด → การ์ด
  (filter bar + ตาราง + pager)
- **`-R`** panel กว้างคงที่ 320px, `sticky` ใต้ header, สูงเกิน viewport ให้ scroll ในตัว
- ช่องว่างระหว่าง `-L` กับ `-R` ~56px ตามดีไซน์
- ข้อความ UI ภาษาอังกฤษทั้งหมด (เหมือนหน้าอื่นของแอป) title/description
  ของแต่ละหน้ากำหนดใน ไฟล์ย่อย
- `metadata.title` = title ของหน้า (template ของ root layout ต่อชื่อแอปให้)

## 5. ตาราง (ทุกหน้า)

### 5.1 หัวตาราง (`table-head.png`)

- ตัวพิมพ์ใหญ่ สี muted · คอลัมน์ที่กำลัง sort: ข้อความและ icon สีขาว
- icon จาก `@keyline-icons/react/two-tone` size 14, strokeWidth 1.5: asc `ArrowDownUp2`,
  desc `ArrowDownUp3`, ยังไม่ sort `ArrowDownUp` สี muted (Q13)
- คลิกคอลัมน์ใหม่ → ใช้ order เริ่มต้นของคอลัมน์นั้น (ข้อความ asc, วันที่/ตัวเลข desc) ·
  คลิกคอลัมน์เดิม → สลับ asc/desc · ทุกครั้ง `page` กลับเป็น 1
- หัวที่ sort ได้เป็น `<button>` ใน `<th>` พร้อม `aria-sort` · คอลัมน์ที่ sort ไม่ได้ไม่มี
  icon
- Keyline ตอนนี้ใช้แค่ใน player ตอนทำให้อัปเดต `ui-components.md` §Icons ว่าใช้ two-tone
  ใน ctrl ด้วย

### 5.2 Table component

- ยังไม่มี `table` ใน `components/ui/` → `bunx --bun shadcn@latest add table` (static
  ไม่มี animation)
- cell แรก (ชื่อ) เป็น `Link` ไปหน้า detail ปุ่ม action อยู่คอลัมน์สุดท้ายแยกจาก link
- plain SSR ไม่มี Suspense / skeleton

### 5.3 Sort · pagination · URL

- state ทั้งหมดอยู่ใน URL ด้วย nuqs: `page`, `take`, `sort`, `order` + filter ของหน้า
  parsers ชุดเดียวกันทั้ง server cache และ client hook (แบบ `browseParsers`)
- เปลี่ยน filter / sort / take → `page` = 1 · `page` เกิน `lastPage` → clamp แบบ browse
- pager ตัวเดียวกับ `/browse` (`@/components/pager`) ซ่อนเมื่อมีหน้าเดียว
- page size: `CONTROL_PAGE_SIZES = [25, 50, 100]` ค่าเริ่มต้น 25
- ตารางที่ข้อมูลน้อยโดยธรรมชาติไม่มี pager (tracks ≤ 5 แถว: season-page §3.2)

### 5.4 Empty state

- ไม่มีข้อมูลเลย: ข้อความ + ปุ่มสร้าง (ถ้าหน้านั้นสร้างได้)
- กรองแล้วไม่เจอ: "No results match these filters." + ปุ่ม **Clear filters**

### 5.5 รูปแบบค่า

| ค่า          | แสดง                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------- |
| วันที่       | date-fns `PP` (`Oct 27, 2026`) · timestamp: `PP` + tooltip `PPpp` (`Oct 27, 2026, 2:05:30 PM`) |
| ระยะเวลา     | `formatTime` (`@/libs/time`) เช่น `23:40`, `1:52:10`                                           |
| ขนาดไฟล์     | `formatBytes` ใหม่ใน `@/libs/utils` (ฐาน 1024: `1.24 GB`)                                      |
| ค่า `null`   | `—`                                                                                            |
| ID           | 8 ตัวแรก (mono) + ปุ่ม copy ค่าเต็ม                                                            |
| path บน disk | mono, ตัดบรรทัดได้, ปุ่ม copy                                                                  |

### 5.6 Chip

- ใช้ `Badge` โทนมืด `bg-<hue>-500/15 text-<hue>-300` (แอปเป็น dark-only ตาม
  `ui-components.md` §Theme ไม่เขียนสไตล์ light) — Q9
- map สีอยู่ใน `utils.ts` ของ route ที่ใช้ (กติกาโปรเจกต์: styling map ไม่อยู่ใน
  constants)

## 6. Filters — 2 แบบ

| แบบ                       | ใช้ที่                            | พฤติกรรม                                                                                                          |
| ------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Filters panel** (`-R`)  | `/ctrl/contents`, `/ctrl/seasons` | เลือกได้หลายค่า เขียนลง URL เมื่อกด **Apply** เท่านั้น มีปุ่ม **Reset** ค่าที่ยังไม่ apply อยู่ใน state ของ panel |
| **Filter bar** เหนือตาราง | หน้า detail                       | ToggleGroup มี `All` เป็นตัวแรก เปลี่ยนแล้วมีผลทันที หน้าตาแบบ toolbar ของ `/watch-histories`                     |

- แสดง **ทุก option** จาก constants เสมอ แม้ไม่มีข้อมูล (ต่างจาก browse ที่ซ่อน/disable
  option ที่ count = 0) จึงเขียน component แยก ไม่ reuse `filter-drawer` ของ browse แต่ใช้
  constants และ parser เดียวกันได้
- ctrl แสดง adult kinds (`ADULT_KINDS`) ปกติ ไม่ซ่อนแบบ browse

## 7. Modals & ฟอร์ม

- `ModalComponent` (`@/components/ui/modal`): ปิดได้จากปุ่มในตัวเท่านั้น (คลิกข้างนอก /
  Esc ไม่ปิด) ข้อมูลที่กรอกไม่หายโดยบังเอิญ
- react-hook-form + `zodResolver` ด้วย validator ตัวเดียวกับ action
- action คืน `{ ok: true, … }` / `{ ok: false, errors }` / `{ ok: false, message }` แบบ
  `createContent`: `errors` ลง `FieldError` ของช่องนั้น, `message` เป็น `Alert` เหนือปุ่ม
- ระหว่างส่ง: ปุ่ม submit disabled + spinner และปิด modal ไม่ได้
- สำเร็จ: ปิด modal + toast สั้น ๆ (เช่น "Content saved") หน้า re-render เองจาก Server
  Action + `updateTag` (ไม่ต้อง `router.refresh()`) · ล้มเหลวที่ไม่ใช่ field error →
  `message` ใน modal ไม่ใช่ toast (Q6: เพิ่ม `sonner`)
- ฟอร์มแก้ไข: ค่าเริ่มต้นคือข้อมูลปัจจุบัน ปุ่ม **Save** disabled จนกว่าจะมีการแก้
  (`formState.isDirty`)
- ช่อง path ทุกช่องใช้ `mediaPath` (รับ "Copy as path" ของ Windows ได้) และตรวจบน disk
  ฝั่ง server แบบ `createSeason`
- ลบข้อมูล (content / season / episode) ไม่มีใน v1 (Q7)

## 8. Data & cache

### 8.1 reader ของ ctrl ไม่ cache

- หน้า ctrl ต้องเห็นข้อมูลล่าสุดทันทีหลังแก้ และเป็น dynamic อยู่แล้ว (อ่าน cookie) คนใช้
  1–2 คน → reader ใน `actions/read.ts` ของแต่ละ route **ไม่ใส่ `"use cache"`** query
  ตรงทุก request
- ห่อ `withRole(STAFF_ROLES, …)` · query ที่ไม่ขึ้นต่อกันใช้ `Promise.all` ·
  `export const instant = false` แบบ layout ที่อ่าน session
- ไม่ select `accounts.password` และ path บน disk ส่งให้ Client Component ได้เฉพาะในหน้า
  ctrl (staff เท่านั้น)

### 8.2 mutation ต้อง invalidate cache ของหน้า public

| Mutation                  | `updateTag`                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `createContent`           | `contents/list` (มีแล้ว)                                                                                         |
| `updateContent`           | `contents/list`, `contents/{contentId}`★, `contents/{contentId}/episodes`                                        |
| `createSeason`            | `seasons/list` (มีแล้ว)                                                                                          |
| `updateSeason`            | `seasons/list`, `seasons/{seasonId}`, `seasons/{seasonId}/episodes`, `contents/{contentId}/episodes`             |
| `updateEpisode`           | `episodes/{episodeId}`, `seasons/{seasonId}/episodes`, `contents/{contentId}/episodes`                           |
| `saveSkip` / `deleteSkip` | `episodes/{episodeId}`                                                                                           |
| `captureThumbnail`        | `episodes/{episodeId}` + (ถ้าเดิมไม่มี thumbnail) `seasons/{seasonId}/episodes`, `contents/{contentId}/episodes` |
| `refreshSeasonCache`      | ทุก tag ของ season นั้น (season-page §2.4)                                                                       |

★ `readWatchEpisode` (tag `episodes/{id}`) มีชื่อ content/season อยู่ด้วย แก้ชื่อ content
แล้วต้องล้างทุก episode ใต้มัน เสนอให้ reader นี้เรียก
``cacheTag(`contents/${content.id}`, `seasons/${season.id}`)`` เพิ่มหลัง query (เรียก
`cacheTag` หลังได้ข้อมูลแล้วได้) แล้ว mutation ล้างแค่ tag เดียว

### 8.3 รูปไม่เปลี่ยนหลังแก้ (art cache) — ยอมรับได้

`/api/art/...` ส่ง `Cache-Control: public, max-age=86400` และ `next/image` เก็บรูปที่
optimize แล้วตาม max-age นั้น ถ่าย thumbnail ใหม่หรือเปลี่ยน poster แล้ว browser
อาจเห็นรูป เก่า 1–2 วันแม้ล้าง tag แล้ว — **ยอมรับได้ ไม่ทำ version ใน URL** (Q10)

## 9. งานที่ต้องเพิ่มนอก route (สรุป)

- `withRole(STAFF_ROLES, …)`, `STAFF_ROLES`, `isStaff` (§1) และ redirect staff ใน layouts
  (§1.3)
- ห่อ `createContent` / `createSeason` ด้วย `withRole(STAFF_ROLES, …)`
- `updateContent`, `updateSeason`, `updateEpisode`, `saveSkip`, `deleteSkip`,
  `captureThumbnail`, `refreshSeasonCache`
- ย้าย `writeWebp`, `fitFilter`, `THUMBNAIL_WIDTH/HEIGHT` และกติกาเลือก track ทำภาพจาก
  `tests/tracks/` ไป `src/libs/` (season-page §3.4) — ย้าย ไม่ copy
- ดึงเงื่อนไข filter + search ของ browse (`read.ts`) ออกเป็น shared ให้ `/ctrl/seasons`
  ใช้ชุดเดียวกัน (season-page §1.2)
- `formatBytes`, `EPISODE_KINDS` + `EPISODE_KIND_LABELS`, `CONTROL_PAGE_SIZES`
- shadcn: `table`, `slider` (skip editor), multi-select สำหรับ genres (Base UI Combobox
  `multiple`) — ขั้นตอนตาม `ui-components.md`
- toast: `bunx --bun shadcn@latest add sonner` + `<Toaster />` ใน `ControlShell`

## 10. ลำดับการทำ

1. สิทธิ์ (§1) + `ControlShell` + screen notice + toast + redirect `/ctrl`
2. ของใช้ร่วม: data-table, sort head, pager, detail panel, copy button
3. `/ctrl/accounts` (ง่ายสุด ใช้ทดสอบของใช้ร่วม)
4. `/ctrl/contents` + modal content → `/ctrl/contents/[contentId]` + modal season
5. `/ctrl/seasons` → `/ctrl/seasons/[seasonId]` (+ import command, refresh cache)
6. หน้า episode: edit → skip editor → thumbnail (ต้องย้าย ffmpeg helper ก่อน)
7. ลบ lab import ทั้งสอง · `bunx prettier --write` · `bun run build`

## 11. การตัดสินใจ (ตอบแล้ว 2026-10-27)

| #   | เรื่อง                        | คำตอบ                                                                      |
| --- | ----------------------------- | -------------------------------------------------------------------------- |
| Q1  | route group แทน rewrites      | ใช้ `(controls)/ctrl`                                                      |
| Q2  | breakpoint                    | 1440px ตามเดิม                                                             |
| Q3  | `root` vs `admin`             | ตอนนี้เท่ากัน · อนาคต action ที่จัดการไฟล์บน disk (`node:fs`) เป็นของ root |
| Q4  | ปุ่ม settings ใน header       | ยังไม่ใส่                                                                  |
| Q5  | search                        | ไป `/ctrl/seasons` เสมอ                                                    |
| Q6  | toast                         | **เพิ่ม** (`sonner`)                                                       |
| Q7  | ลบ content / season / episode | ไม่มีใน v1                                                                 |
| Q8  | import                        | copy คำสั่งพอ · **ยกเลิก** queue                                           |
| Q9  | สี chip                       | โทน soft `bg-*-500/15 text-*-300`                                          |
| Q10 | version ใน URL รูป            | **ไม่ทำ** ยอมรับ cache 1–2 วัน                                             |
| Q11 | ไอคอนหัวตารางตอนยังไม่ sort   | `ArrowDownUp` สี muted                                                     |

คำตอบเฉพาะหน้าอยู่ท้ายไฟล์ย่อย (C1…, S1…, A1…)

## 12. ข้อเสนอ phase 2 (ยังไม่ทำ)

- **Dashboard `/ctrl`** แทน redirect: ตัวเลขรวม + รายการที่ต้องแก้ เช่น season ที่ยังไม่มี
  episode, ภาษาใน `sources` ที่ยังไม่มี track, episode ที่ไม่มี thumbnail/sprite, track
  ที่ไฟล์ หายจาก disk
- **จัดการ accounts** (account-page §3)
- **แก้ episode ทีละหลายตอน**: วางชื่อตอน / วันออกอากาศเป็นรายการเดียวแล้ว map ตาม
  `episodeNo`
- **`episodes.thumbnail_at`**: เก็บวินาทีที่เลือก thumbnail เอง ให้
  `track.spec.ts --force` ถ่ายซ้ำที่เดิมแทนการเขียนทับ (season-page §3.4)

## 13. สิ่งที่ต่างจากแผนตอนลงมือทำ

- **Guard**: ใช้ `withRole(STAFF_ROLES, …)` ตัวเดียว (ไม่มี `withStaff`) และ
  `redirectStaff(account)` ใน `@/actions/auth` สำหรับ layout ของ site + หน้า `/watch`
- **ของใช้ร่วมใน ctrl**: reader ตาราง seasons อยู่ `src/app/(controls)/actions/read.ts`
  (`readSeasonRows`), hook `use-control-query` (เขียน URL) และ `use-filter-draft` (draft +
  Apply/Reset ของ filters panel), `Toaster` อยู่ใน `(controls)/layout.tsx`
- **Search**: ย้ายเฉพาะเงื่อนไขค้นหา + การจัดอันดับไป `@/actions/contents/search.ts`
  (`seasonSearch`, `seasonSearchRank`, `escapeLike`) ให้ browse กับ `/ctrl/seasons`
  ใช้ร่วม ตัวกรองอื่นของ browse ไม่แตะ (browse รับค่าเดียว + ซ่อน adult kinds)
- **ffmpeg**: `writeWebp`, `fitFilter`, `writeThumbnail`, `THUMBNAIL_WIDTH/HEIGHT` ย้ายไป
  `src/libs/ffmpeg.ts` และเปลี่ยนเป็น async (`execFile`) เพื่อไม่บล็อก server
  ระหว่างถ่ายภาพ · กติกาเลือก track เป็น `artTrack` ใน `@/libs/media` ·
  `tests/tracks/thumbnail.ts` เหลือแค่ `thumbnailTime`
- **อื่น ๆ**: `optionalText` ย้ายไป `@/libs/validator.zod` · `formatBytes` อยู่ `utils.ts`
  ของหน้า episode (ใช้ที่เดียว) · `readWatchEpisode` ติด tag `contents/{id}` +
  `seasons/{id}` ตาม §8.2★ · `GENRE_LABELS` อยู่ `@/constants/data/genres`
- **ตาราง seasons**: ภาษาเสียงเป็น chip ใต้ชื่อ season แทนคอลัมน์ Audio แยก
- **Import command** เป็น modal (ไม่ใช่ popover) · **skip editor** แสดง skip อื่นบนแถบ
  timeline แยกเหนือ slider · **capture thumbnail** มีปุ่มเลื่อน −1s / −0.1s / +0.1s / +1s
- **ลบแล้ว**: `(labs)/import-content`, `(labs)/import-season` และ `readContentOptions`
  ที่ใช้แค่ใน lab
- **เจอระหว่างทาง (ของเดิม ยังไม่แก้)**: `/error-boundary` ใช้ `@/components/link`
  โดยไม่มี `MainStoreProvider` (dev แจ้ง error) · header ของ site ส่ง `profiles.avatar` =
  `default-avatar.webp` ให้ `next/image` ตรง ๆ · `React.FormEvent` (deprecated) ใน
  `header-search.tsx` และ lab sign-in
