# Control: Seasons & Episodes — `/ctrl/seasons/…`

> ส่วนหนึ่งของ [Control Panel spec](../control-spec.md) (อ้างถึงเป็น `main §N`) · ดีไซน์:
> `docs/design/controls/page-layout.png`, `table-head.png`, `skip-editer.png`,
> `docs/design/watch-history/00-list-view.png` (cell แรกของตาราง seasons)

## 0. ตาราง seasons (ใช้ร่วม 2 หน้า)

ใช้ที่ `/ctrl/seasons` (§1) และ `/ctrl/contents/[contentId]` (content-page §2.2)

| Column   | ค่า                                                                                                                                                                                                               | Sort                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Season   | poster เล็ก 2:3 (`/api/art/poster/[id]`) + `seasonName(...)` (link → `/ctrl/seasons/[seasonId]`) + บรรทัดรอง: content title + `KIND_LABELS` ของ content (เฉพาะ `/ctrl/seasons`) — แบบ list view ของ watch history | ✓ ตามชื่อ content แล้ว `releasedOn` |
| Kind     | chip `SEASON_KIND_LABELS[season.kind]` (S1)                                                                                                                                                                       | ✓                                   |
| Status   | `SeasonStatus` (`@/components/season/status.tsx`)                                                                                                                                                                 | ✓                                   |
| Audio    | **เพิ่ม**: ภาษาจาก `sources` (original ก่อน) ด้วย `languageCode`                                                                                                                                                  | —                                   |
| Episodes | **เพิ่ม**: จำนวน episode ที่ import แล้ว · 0 → chip "Not imported"                                                                                                                                                | ✓                                   |
| Released | `releasedOn`                                                                                                                                                                                                      | ✓                                   |

"Episodes = 0" บอกว่ายังไม่ได้รัน `track.spec.ts` ซึ่งร่างแรกไม่มีทางรู้จากหน้าตาราง

## 1. `/ctrl/seasons`

### 1.1 หน้า

- **Title** `Seasons` · **Description** "Every season across the catalogue." · มี
  `?search` → title `Results for “{search}”` + ปุ่มล้างคำค้น
- ไม่มีปุ่มสร้าง (สร้าง season ได้จากหน้า content เพราะต้องรู้ content)
- **Import ongoing** (`root` เท่านั้น): modal เลือก content kind (แสดงจำนวน season ที่
  `upcoming` / `airing` ต่อ kind จาก `readOngoingCounts`) + flag เหมือน §2.3 → รัน
  `bun tests/track.spec.ts --kind <kind>` · การ์ดสถานะ (§2.3) อยู่เหนือตาราง
- เรียงเริ่มต้น `releasedOn desc` · ขณะค้นหา → relevance (ตาม browse)
  จนกว่าจะคลิกหัวคอลัมน์

### 1.2 Filters panel (`-R`, ต้องกด Apply: main §6)

รายการเดียวกับ browse ยกเว้นปี (release year) และแสดงทุก option แม้ไม่มีข้อมูล:

| Filter   | ค่า                               | เงื่อนไข                       |
| -------- | --------------------------------- | ------------------------------ |
| Kind     | `KINDS` (content kind, รวม adult) | `contents.kind in (...)`       |
| Source   | `SOURCES`                         | `contents.source in (...)`     |
| Genres   | `GENRES` (ค้นได้ใน panel)         | ต้องมีครบทุกอัน                |
| Status   | `SEASON_STATUSES`                 | `seasons.status in (...)`      |
| Audio    | `AUDIOS` (`AUDIO_LABELS`)         | มีภาษานั้นใน `seasons.sources` |
| Seasonal | `SEASONALS` (S2)                  | ไตรมาสของ `releasedOn`         |

- browse รับค่าเดียวต่อ filter (ยกเว้น genres) ส่วน ctrl รับหลายค่า → parsers แยกใน
  `validator.nuqs.ts` ของ ctrl แต่ **เงื่อนไข SQL + search ใช้ร่วมกับ browse**:
  ดึงตัวสร้าง `where` ออกจาก `(public)/browse/actions/read.ts` ไปเป็น shared (ย้าย ไม่
  copy) ให้รับ array ได้ แล้ว browse ส่ง array 1 ค่า
- reader `readControlSeasons(query)` → `Pagination<…>`

## 2. `/ctrl/seasons/[seasonId]`

- **Breadcrumb** `Contents › {content.title} › {seasonName}`
- **Title** `{seasonName}` · **Description** `{content.title}` (+ `season.title` ถ้ามี)

### 2.1 Detail panel (`-R`)

| แถว                           | ค่า                                                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Poster                        | browser อาจเห็นรูปเก่า 1–2 วัน (main §8.3 ยอมรับได้)                                                                                                                                     |
| ชื่อ                          | `seasonName` + `title` + seasonNo                                                                                                                                                        |
| Content (**เพิ่ม**)           | link → `/ctrl/contents/[contentId]`                                                                                                                                                      |
| ID                            | main §5.5                                                                                                                                                                                |
| Kind · Status · Released on   |                                                                                                                                                                                          |
| Synopsis (**เพิ่ม**)          | clamp + Show more                                                                                                                                                                        |
| Sources                       | ต่อแถว: `languageName` + chip Original/Dub + path (copy) + **เพิ่ม**: สถานะบน disk (`Found` / `Not found` จาก `pathType`) และจำนวน track ที่ import แล้วของภาษานั้น (`12 / 12 episodes`) |
| Created · Updated (**เพิ่ม**) |                                                                                                                                                                                          |

ปุ่ม: **Edit season** (§2.5) · **Import tracks** (§2.3, `root`) · **Refresh site cache**
(§2.4)

### 2.2 ตาราง episodes

- **Filter bar** (main §6): ToggleGroup `Kind` (All + `EPISODE_KINDS`) และ `Audio` (All +
  ภาษาใน `season.sources`) → `?kind=` `?audio=` · Audio = episode ที่**มี track** ภาษานั้น
- เรียงเริ่มต้น `episodeNo asc` · มี pager (season ยาวมีได้หลายร้อยตอน)

| Column   | ค่า                                                                                                      | Sort |
| -------- | -------------------------------------------------------------------------------------------------------- | ---- |
| #        | `episodeNo` (pad2)                                                                                       | ✓    |
| Title    | **เพิ่ม** thumbnail 16:9 เล็ก + `episodeTitle(...)` (ไม่มี title → ชื่อตาม kind/no.) link → หน้า episode | —    |
| Kind     | `EPISODE_KIND_LABELS` (ใหม่: Regular, Special, OVA, Recap)                                               | ✓    |
| Audio    | chip ภาษาของ track ที่มี · ภาษาที่อยู่ใน `sources` แต่ไม่มี track → chip จาง + tooltip "Not imported"    | —    |
| Duration | **เพิ่ม**: จาก track แรก (original ก่อน)                                                                 | ✓    |
| Skips    | **เพิ่ม**: ตัวย่อของ skip ที่ตั้งแล้ว (`I` `O` `R`) หรือ `—`                                             | —    |
| Aired    | `airedOn` หรือ `—`                                                                                       | ✓    |

### 2.3 Import tracks (`root` เท่านั้น)

ปุ่ม **Import tracks** (เห็นเฉพาะ `root`) เปิด `ImportModal` → `startImport` รัน
`bun tests/track.spec.ts --season <seasonId> [--remux] [--force]` เป็น child process ของ
server (`@/actions/imports/runner.ts`) ไม่ต้องเปิด terminal

| Flag      | checkbox (ค่าเริ่มต้นไม่ติ๊ก) + คำอธิบาย (`IMPORT_FLAGS`)                                 |
| --------- | ----------------------------------------------------------------------------------------- |
| `--remux` | "Rewrite source files as fragmented MP4. Only needed for files that aren't yet."          |
| `--force` | "Regenerate every thumbnail and sprite sheet. Replaces thumbnails picked by hand (§3.4)." |

- รันได้ทีละงานทั้งระบบ · งานใหม่ถูกปฏิเสธระหว่างที่อีกงานยังรัน (ปุ่ม Start disabled)
- modal ยังมีคำสั่งพร้อมปุ่ม Copy ไว้รันใน terminal เอง
- ทำไมไม่ใส่ `--remux --force` ไว้เสมอ: `--remux` แตะไฟล์ต้นฉบับโดยไม่จำเป็น และ `--force`
  เขียนทับ thumbnail ที่เลือกเองทั้ง season
- ทำไมเป็นของ `root`: ทั้งสอง flag เปลี่ยนไฟล์บน disk (main Q3)

**การ์ดสถานะ** (`ImportStatusCard`, เหนือตาราง episodes และตาราง `/ctrl/seasons`)

- แสดงงานล่าสุดของทั้งระบบ (ไม่ใช่เฉพาะ season นี้): ชื่อ (link → season) · chip สถานะ
  Running / Cancelling / Done / Failed / Cancelled · flag · คนสั่ง · เวลาเริ่ม ·
  เวลาที่ใช้
- log สดผ่าน SSE (`GET /api/imports`, root เท่านั้น) เก็บ 1,000 บรรทัดล่าสุด เลื่อนตาม
  บรรทัดใหม่เมื่ออยู่ล่างสุด · ย่อ/ขยายได้
- **Cancel**: สร้าง cancel file (`--cancel-file`) → script หยุดที่จุดปลอดภัยถัดไป (ระหว่าง
  season, ไฟล์ที่ remux, ก่อนเขียน DB, ระหว่างภาพของแต่ละตอน) จึงไม่มีไฟล์ remux ค้าง
  ครึ่งทาง · **Dismiss**: ซ่อนงานที่จบแล้ว
- จบงาน (สำเร็จ ล้มเหลว หรือยกเลิก) → `refreshImportCache` ล้าง cache ของทุก season
  ที่งานแตะ แล้ว toast
- สถานะอยู่ในหน่วยความจำของ server: restart server แล้วงานหยุดพร้อมกัน (รันซ้ำได้ เพราะ
  script upsert)
- exit code ของ script: `0` สำเร็จ · `1` ล้มเหลว · `2` ยกเลิก (`IMPORT_EXIT_CODES`)

### 2.4 Refresh site cache (**เพิ่ม**)

- `track.spec.ts` รันนอก process ของ Next จึงเรียก `updateTag` ไม่ได้ (script
  เตือนไว้เองว่า server จะเสิร์ฟ path เก่าจนกว่า `cacheLife("hours")` หมด) หลัง import
  หน้า public จะยังไม่ เห็น episode/track ใหม่ได้หลายชั่วโมง
- import จากหน้า ctrl ล้าง cache เองเมื่องานจบ (§2.3) ปุ่มนี้มีไว้หลังรันจาก terminal
- ปุ่มเรียก `refreshSeasonCache(seasonId)` (`expireSeasonCaches` ใน
  `@/actions/contents/cache.ts` ใช้ร่วมกับ import): `updateTag` ของ `seasons/list`,
  `seasons/{id}`, `seasons/{id}/episodes`, `contents/{contentId}/episodes`,
  `episodes/{eid}` และ `tracks/{tid}` ทุกตัวใน season

### 2.5 Modal: Edit season

ฟอร์มเดียวกับ New season (content-page §4) · content แสดงอย่างเดียว ย้าย season ไป content
อื่นไม่ได้ (S3) · validator `seasonValidator.omit({ contentId: true })` · action
`updateSeason(seasonId, input)` ใน `@/actions/contents/update.ts`

ผลข้างเคียงที่ต้องเตือนใน modal เมื่อค่าเปลี่ยน:

| แก้                             | ผล                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kind / Season no.               | โฟลเดอร์ภาพ (`seasonArtDirectory`) เปลี่ยน: ภาพเดิมยังใช้ได้ (DB เก็บ path เต็ม) แต่ import ครั้งหน้าเขียนลงโฟลเดอร์ใหม่ · ต้องผ่าน unique (content, seasonNo) + `seasons_season_no_check` |
| เพิ่ม source (dub ใหม่)         | กรณีปกติ: บันทึกแล้วกด Import tracks                                                                                                                                                       |
| ลบ source                       | track ภาษานั้นที่ import แล้ว**ยังอยู่**และเล่นได้ (track ไม่ผูกกับ sources) → เตือน                                                                                                       |
| เปลี่ยน path ของ primary source | ตรวจซ้ำกับ season อื่นแบบ `createSeason` (ยกเว้นตัวเอง) · โฟลเดอร์ที่ยังไม่มีจะถูกสร้าง                                                                                                    |
| Poster                          | ต้องทำ version ใน URL รูป (main §8.3) ไม่งั้นเห็นรูปเก่า                                                                                                                                   |

## 3. `/ctrl/seasons/[seasonId]/episodes/[episodeId]`

- **Breadcrumb** `Contents › {content} › {seasonName} › {episodeTag}`
- **Title** `episodeTitle(...)` · **Description** `{content.title} · {seasonName}`
- **เพิ่ม**: ปุ่ม ‹ Prev / Next › episode ข้าง title (ตั้ง skip ทีละตอนต่อกันได้เร็ว)

### 3.1 Detail panel (`-R`)

| กลุ่ม              | แถว                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Season             | poster เล็ก + `seasonName` + content title (link → หน้า season) · ID · Kind · Status · Released on |
| Episode            | **เพิ่ม** thumbnail 16:9 · ID · No. · Kind · Title · **เพิ่ม** Synopsis · **เพิ่ม** Aired on       |
| Skips              | ต่อแถว: kind + `from – to` (ไม่มี → "No skips")                                                    |
| Sprite (**เพิ่ม**) | `143 tiles · every 10s` หรือ "Not generated"                                                       |

ปุ่ม: **Edit episode** (§3.3) · **Capture thumbnail** (§3.4) · **Edit skips** (§3.5)

### 3.2 Tracks (การ์ดแนวตั้ง)

แสดงเป็นการ์ดแทนตาราง (episode มี track ได้ไม่เกินจำนวน `Locales` ไม่มี filter/pager) 3
คอลัมน์ ตาม mockup ที่ยืนยันแล้ว (https://claude.ai/artifact/WfBjAxvJdS7do2vCVvaooD)

- แถบบน: `Tracks` + "N of M audio versions imported"
- ส่วนบนของการ์ด (แทน poster): ไอคอน `AudioLinesSparkles`
  (`@keyline-icons/react/two-tone`) · chip ภาษา (ขาว) + Original / Dub · รหัส locale
  มุมขวา
- รายละเอียด: Resolution · Duration · Size · Fragments · Codec (mono) · File (path เต็ม,
  mono)
- ท้ายการ์ด: Copy path · Copy ID
- ภาษาที่อยู่ใน `season.sources` แต่ไม่มี track: การ์ดเส้นประ, chip `Not imported`, path
  ของ source และ (เฉพาะ `root`) ปุ่ม **Import from the season** → หน้า season

### 3.3 Modal: Edit episode

| ฟิลด์                | กติกา                        |
| -------------------- | ---------------------------- |
| Kind                 | select `EPISODE_KIND_LABELS` |
| Title                | optional ≤ 255               |
| Synopsis             | optional ≤ 10,000            |
| Aired on (**เพิ่ม**) | date optional (S4)           |

- `episodeNo` แก้ไม่ได้: มาจากชื่อไฟล์ (`01.mp4`) ถ้าเปลี่ยน import ครั้งหน้าจะจับคู่ผิด
- action `updateEpisode(episodeId, input)` ใน `@/actions/episodes/update.ts`

### 3.4 Modal: Capture thumbnail

- **Track ที่ใช้**: กติกาเดียวกับ `generateArt` ใน `tests/track.spec.ts` — dub ก่อน
  (`isDubbed: true`, เรียงตาม language) ไม่มี dub ใช้ original → ดึงกติกานี้เป็น helper
  `artTrack(tracks)` ใน `@/libs/media` ให้ script กับ action ใช้ตัวเดียวกัน
- **UI**: `<video src="/api/stream/{trackId}">` ธรรมดา (route รองรับ Range อยู่แล้ว
  ไม่ต้องใช้ LMP และไม่ส่ง progress) + ปุ่ม −1s / −0.1s / +0.1s / +1s + เวลาปัจจุบัน +
  thumbnail เดิมไว้เทียบ
- **Capture**: `captureThumbnail(episodeId, seconds)` → server รัน ffmpeg ดึง 1 เฟรม
  640×360 เขียนทับไฟล์เดิมที่ `episodes.thumbnail` (ถ้า null ใช้ `seasonArtDirectory` +
  `fileStem` แล้วบันทึก path) → `updateTag` ตาม main §8.2
- ต้องย้าย `writeWebp`, `fitFilter`, `THUMBNAIL_WIDTH/HEIGHT` จาก `tests/tracks/` ไป
  `src/libs/` (server-only) และให้ `writeThumbnail` รับวินาทีได้ (`thumbnailTime` อยู่ใน
  script ต่อ) · process ของ server ต้องหา `ffmpeg` เจอใน PATH ไม่เจอ → `message`
- รูปเปลี่ยนแต่ browser ยังโชว์รูปเก่า → main §8.3
- `--force` ของ `track.spec.ts` จะเขียนทับภาพที่เลือกเอง (§2.3) ทางแก้ระยะยาว: คอลัมน์
  `episodes.thumbnail_at` (main §12, S5)

### 3.5 Modal: Skip editor (`skip-editer.png`)

จากดีไซน์ + ส่วนที่เพิ่ม:

- **วิดีโอ**: `<video>` ธรรมดา track เดียวกับ §3.4
- **แถบช่วงเวลา**: timeline ทั้งตอน มี 2 handle (from / to) ช่วงที่เลือกเป็นสีเด่น ใช้
  Slider แบบ range ของ Base UI (`slider` ต้องเพิ่ม) · **เพิ่ม**: skip kind
  อื่นที่ตั้งไว้แสดงจาง ๆ บน แถบเดียวกัน
- **ช่องเวลา** `FROM` · `LENGTH` · `TO` รูปแบบ `HH:MM:SS` — ช่องกลางคือความยาว
  (`to − from`) แก้ ช่องไหนก็อัปเดตแถบ แก้ LENGTH จะเลื่อน TO
- **เพิ่ม**: ปุ่ม **Set from current time** / **Set to current time** (เล่น หยุดตรงต้น
  intro แล้วกด เร็วกว่าพิมพ์)
- **Kind**: radio `intro` / `outro` / `recap` · เลือก kind ที่มีอยู่แล้ว →
  โหลดช่วงเดิมขึ้นมาแก้ และ Save = **เขียนทับ** kind นั้น (ตามร่างแรก)
- **เพิ่ม**: ปุ่ม **Remove** ลบ skip ของ kind ที่เลือก (ร่างแรกไม่มีทางลบ)
- **Actions**: `saveSkip(episodeId, { kind, from, to })` (upsert ตาม kind) และ
  `deleteSkip(episodeId, kind)` ใน `@/actions/episodes/update.ts`
- **ตรวจ** (Zod + server รู้ duration จาก track): `0 ≤ from < to ≤ duration` · ความยาว ≥
  1s · ไม่ทับช่วงของ kind อื่น (S6) · วินาทีเป็นจำนวนเต็ม (S7)
- skip ใช้ร่วมทุก track ของ episode (`episodes.skips`) — สมมติว่า dub มี timing เท่า
  original
- แก้ skip ไม่ถ่าย thumbnail ใหม่ให้ (ภาพตั้งต้นของ script อิงเวลาจบ intro แต่ไม่ย้อนแก้)
- nice-to-have: hover บนแถบแสดงภาพจาก sprite sheet แบบ preview ของ player

## 4. Edge cases

- season ที่ยังไม่ import: ตาราง episodes ว่าง → `root`: "No episodes yet. Import tracks
  to fill this table." · `admin`: "No episodes yet."
- episode ไม่มี track (import ค้าง): ปุ่ม Capture thumbnail / Edit skips disabled +
  tooltip
- episode ไม่มี thumbnail → placeholder ใน panel และตาราง
- `movie` มี 1 episode: หน้า season ยังแสดงตารางปกติ (1 แถว)
- `episodeId` ไม่อยู่ใน `seasonId` → 404 (main §2.2)

## 5. การตัดสินใจ

| #   | เรื่อง                          | คำตอบ                                       |
| --- | ------------------------------- | ------------------------------------------- |
| S1  | คอลัมน์ Kind ของตาราง seasons   | `seasons.kind` · content kind อยู่บรรทัดรอง |
| S2  | ตัด release year                | ตัดแค่ปี เก็บ Seasonal                      |
| S3  | ย้าย season ไป content อื่น     | ไม่ได้                                      |
| S4  | แก้ `airedOn` ใน Edit episode   | แก้ได้                                      |
| S5  | คอลัมน์ `episodes.thumbnail_at` | ยังไม่ทำ · เตือนใน popover แทน              |
| S6  | skip ต่าง kind ทับช่วงกัน       | ไม่ได้                                      |
| S7  | ความละเอียดของเวลา skip         | วินาทีเต็ม                                  |
