# Control: Contents — `/ctrl/contents`, `/ctrl/contents/[contentId]`

> ส่วนหนึ่งของ [Control Panel spec](../control-spec.md) (อ้างถึงเป็น `main §N`) · ดีไซน์:
> `docs/design/controls/page-layout.png`, `alt-titles.png`

## 1. `/ctrl/contents`

- **Title** `Contents` · **Description** "Every title in the catalogue. Open one to manage
  its seasons."
- ปุ่ม **New content** ข้าง title → modal §3

### 1.1 ตาราง

| Column  | ค่า                                                                     | Sort              |
| ------- | ----------------------------------------------------------------------- | ----------------- |
| Title   | `title` (link → `/ctrl/contents/[contentId]`) + `slug` บรรทัดรอง muted  | ✓ ค่าเริ่มต้น asc |
| Kind    | chip `KIND_LABELS[kind]`                                                | ✓                 |
| Source  | `SOURCE_LABELS[source]` หรือ `—`                                        | ✓                 |
| Genres  | chip สูงสุด 3 อัน + `+N` (tooltip แสดงทั้งหมด)                          | —                 |
| Seasons | จำนวน seasons (**เพิ่ม**: 0 = ยังไม่ได้สร้าง season)                    | ✓                 |
| Updated | `updatedAt ?? createdAt` (**เพิ่ม**)                                    | ✓                 |
| ⋯       | dropdown: **Edit** (modal §3) · **New season** (modal §4) · **Copy ID** | —                 |

### 1.2 Filters panel (`-R`, ต้องกด Apply: main §6)

| Filter | ค่า                                           | URL                        | เงื่อนไข                                     |
| ------ | --------------------------------------------- | -------------------------- | -------------------------------------------- |
| Kind   | `KINDS` ทั้งหมด (เลือกได้หลายค่า)             | `?kind=anime_series,movie` | `kind in (...)`                              |
| Source | `SOURCES` ทั้งหมด (หลายค่า) (**เพิ่ม**)       | `?source=manga`            | `source in (...)`                            |
| Genres | `GENRES` ทั้ง 74 (หลายค่า, มีช่องค้นใน panel) | `?genres=action,drama`     | ต้องมีครบทุกอัน (`arrayContains` แบบ browse) |

- รายการ genres ยาว → panel แสดงเป็น list ที่ค้นได้ + scroll ในตัว
- reader: `readControlContents(query)` ใน `actions/read.ts` คืน `Pagination<…>` (count
  seasons ด้วย subquery)

## 2. `/ctrl/contents/[contentId]`

- **Breadcrumb** `Contents › {title}`
- **Title** `{title}` · **Description** alt titles ต่อกันด้วย `·` (ไม่มี → `slug`)

### 2.1 Detail panel (`-R`)

| แถว                           | ค่า                                      |
| ----------------------------- | ---------------------------------------- |
| ID                            | main §5.5                                |
| Slug                          | mono                                     |
| Title                         |                                          |
| Alternative titles            | 日本語 · ภาษาไทย · English (ไม่มี → `—`) |
| Kind · Source                 | chip / label                             |
| Genres                        | chips                                    |
| Source directory              | path + copy (main §5.5)                  |
| Synopsis (**เพิ่ม**)          | clamp 6 บรรทัด + Show more               |
| Created · Updated (**เพิ่ม**) | วันที่                                   |

ปุ่ม: **Edit content** (modal §3) · **New season** (modal §4)

### 2.2 ตาราง seasons

- ใช้ตาราง seasons ตาม [season-page §0](season-page.md) แต่ไม่มีคอลัมน์ content (ทุกแถว
  content เดียวกัน)
- เรียงเริ่มต้น `releasedOn asc` (ลำดับการออกฉาย เหมือนหน้า public)
- **Filter bar** (main §6): ToggleGroup `Kind` (All + `SEASON_KINDS`) และ `Status` (All +
  `SEASON_STATUSES`) → `?kind=` `?status=`
- empty: "No seasons yet." + ปุ่ม **New season**

## 3. Modal: New / Edit content

### 3.1 ฟิลด์

| ฟิลด์                         | Input                                                                        | กติกา                                       |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------- |
| Title                         | input                                                                        | required ≤ 255                              |
| Slug                          | **New**: input (optional) · **Edit**: แสดงอย่างเดียว                         | §3.2                                        |
| Alternative titles (Optional) | กลุ่มกรอบตาม `alt-titles.png`: 日本語 (`JP`), ภาษาไทย (`TH`), English (`EN`) | แต่ละช่อง ≤ 255                             |
| Kind                          | select `KIND_LABELS`                                                         | required                                    |
| Source                        | select `SOURCE_LABELS` + "None"                                              | optional                                    |
| Genres                        | multi-select ที่ค้นได้ (main §9)                                             | optional                                    |
| Synopsis                      | textarea                                                                     | ≤ 10,000                                    |
| Source directory              | input mono                                                                   | required · ต้องเป็นโฟลเดอร์ที่มีจริง (§3.3) |

- validator: `contentValidator` (มีแล้ว) · Edit ใช้
  `contentValidator.omit({ slug: true })`

### 3.2 Slug

- **New** (ของเดิม): เว้นว่าง → `slugify(title)` · title ไม่มีอักษรละติน
  (เช่นไทย/ญี่ปุ่นล้วน) → ต้องพิมพ์ slug เอง · ซ้ำ → `message`
- **Edit**: แก้ slug ตรง ๆ ไม่ได้ เมื่อ title เปลี่ยน → slug ใหม่ = `slugify(title ใหม่)`
  - ระหว่างพิมพ์แสดงตัวอย่างใต้ช่อง title: "Slug will change to `new-slug`"
  - `slugify` ได้ค่าว่าง (title ไม่มีละติน) → **คง slug เดิม** ไม่ error (C1)
  - ซ้ำกับ content อื่น →
    `{ ok: false, message: 'Slug "x" is already used by another content' }`
    ไม่บันทึกอะไรเลย
- slug ไม่อยู่ใน URL ของหน้า public (`/content/[seasonId]` ใช้ seasonId) แต่ส่งให้ player
  ผ่าน `readWatchEpisode` → ล้าง cache ตาม main §8.2

### 3.3 Source directory

- ตรวจว่าเป็นโฟลเดอร์ที่มีจริง (`pathType(...) === "directory"`) ทั้งตอนสร้างและแก้ —
  `createContent` ตอนนี้**ยังไม่ตรวจ** ให้เพิ่ม
- แก้ใน Edit ได้ (C2) แต่ไม่ย้ายไฟล์: season เดิมเก็บ path เต็มไว้แล้วจึงยังเล่นได้ แต่
  `seasonArtDirectory` ต้องการให้ primary source อยู่ใต้ `sourceDir`
  ถ้าไม่อยู่ใต้โฟลเดอร์ใหม่ `track.spec.ts` จะ import season นั้นไม่ได้อีก →
  เมื่อค่าเปลี่ยน แสดงคำเตือนใน modal และ server ตอบ `message` บอกจำนวน season ที่ source
  อยู่นอกโฟลเดอร์ใหม่ (ยังบันทึกได้)

### 3.4 Actions

- `createContent` (มีแล้ว): + `withRole(STAFF_ROLES, …)` + ตรวจ source directory ·
  สำเร็จแล้วไปหน้า `/ctrl/contents/[newId]` (ขั้นต่อไปคือสร้าง season)
- `updateContent(contentId, input)` ใหม่ใน `@/actions/contents/update.ts` · cache tags:
  main §8.2

## 4. Modal: New season

เปิดจากหน้า content เท่านั้น (`contentId` รู้แล้ว) — `/ctrl/seasons` ไม่มีปุ่มนี้
ฟอร์มเดียวกันใช้กับ **Edit season** ([season-page §2.5](season-page.md))

| ฟิลด์       | Input                                                                                                         | กติกา (`seasonValidator`)                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Kind        | select `SEASON_KIND_LABELS`                                                                                   | ค่าเริ่มต้น `season`                                         |
| Season no.  | number                                                                                                        | `season`: required · `movie`: ซ่อน · อื่น ๆ: optional        |
| Title       | input                                                                                                         | optional ≤ 255 (ว่าง → ชื่อจาก `seasonName`)                 |
| Status      | select `STATUS_LABELS`                                                                                        | ค่าเริ่มต้น `finished`                                       |
| Released on | date                                                                                                          | required                                                     |
| Poster      | path                                                                                                          | ไฟล์รูป (`IMAGE_EXTENSIONS`) ที่มีจริง                       |
| Synopsis    | textarea                                                                                                      | ≤ 10,000                                                     |
| Sources     | รายการแถว: Language (select ด้วย `languageName`) · Path · Dubbed (checkbox) · ปุ่มลบแถว · ปุ่ม **Add source** | ≥ 1 แถว · original (`isDubbed: false`) ได้แค่ 1 · ภาษาไม่ซ้ำ |

- placeholder ของ Path ตาม kind: movie → "Full path to the `.mp4` file", อื่น ๆ → "Folder
  of `01.mp4`, `02.mp4`, …"
- แถวใหม่เติม `{sourceDir}/` ให้ก่อน (**เพิ่ม**: ลดการพิมพ์ path ยาว)
- ข้อความช่วย: "Only the primary source (the original, or the first dub) has to exist now.
  Other dubs can be added before their files are ready."
- สำเร็จ → ไป `/ctrl/seasons/[newId]` ที่มีปุ่ม Import command (season-page §2.3)

## 5. Edge cases

- content ที่ไม่มี season: ตาราง §2.2 ว่าง, browse ไม่แสดง content นี้ (browse นับจาก
  seasons)
- title ซ้ำได้ (unique แค่ slug) — แยกด้วย slug บรรทัดรองในตาราง §1.1
- พิมพ์ path แบบ `"C:\…\Frieren"` (มี quote) → `mediaPath` จัดการแล้ว
- genres ที่ไม่อยู่ใน `GENRES` (ข้อมูลเก่า) → แสดง slug ตรง ๆ และเลือกออกได้ใน Edit

## 6. การตัดสินใจ

| #   | เรื่อง                                                             | คำตอบ                 |
| --- | ------------------------------------------------------------------ | --------------------- |
| C1  | แก้ title เป็นภาษาที่ไม่มีละติน                                    | คง slug เดิม          |
| C2  | แก้ source directory หลังสร้าง                                     | ได้ พร้อมคำเตือน §3.3 |
| C3  | ช่องค้นของตาราง contents                                           | ไม่มี ใช้ filter      |
| C4  | คอลัมน์ Seasons (จำนวน) และ Updated ที่เพิ่มจากร่างแรกในตาราง §1.1 | เก็บไว้ (รอยืนยัน)    |
