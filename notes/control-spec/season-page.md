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

ปุ่ม: **Edit season** (§2.5) · **Import command** (§2.3) · **Refresh site cache** (§2.4)

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

### 2.3 Import command (ตอบคำถาม "copy คำสั่ง หรือ tasks/queues")

**v1 = copy คำสั่ง** แต่ไม่ใส่ flag ไว้ให้ลบเอง ปุ่มเปิด popover:

```
bun tests/track.spec.ts --season <seasonId> [--remux] [--force]
```

| Flag      | checkbox (ค่าเริ่มต้นไม่ติ๊ก) + คำอธิบายใน popover                                           |
| --------- | -------------------------------------------------------------------------------------------- |
| `--remux` | "Rewrite source files as fragmented MP4. Only needed for files that aren't yet."             |
| `--force` | "Regenerate every thumbnail and sprite sheet. ⚠️ Replaces thumbnails picked by hand (§3.4)." |

- preview คำสั่งเปลี่ยนตาม checkbox + ปุ่ม **Copy** (Clipboard API ใช้ได้เพราะเป็น HTTPS
  ทั้ง dev และ prod) + บรรทัดเตือน "After the run, press Refresh site cache."
- ทำไมไม่ใส่ `--remux --force` ไว้เสมอแบบร่างแรก: ลืมลบครั้งเดียว `--remux`
  ไปแตะไฟล์ต้นฉบับ โดยไม่จำเป็น และ `--force` เขียนทับ thumbnail ที่เลือกเองทั้ง season
  (script เก็บ thumbnail เดิมไว้โดยตั้งใจ "it may be hand-picked")
- ระบบ tasks/queues: **ยกเลิก** (main Q8) copy คำสั่งอย่างเดียว

### 2.4 Refresh site cache (**เพิ่ม**)

- `track.spec.ts` รันนอก process ของ Next จึงเรียก `updateTag` ไม่ได้ (script
  เตือนไว้เองว่า server จะเสิร์ฟ path เก่าจนกว่า `cacheLife("hours")` หมด) หลัง import
  หน้า public จะยังไม่ เห็น episode/track ใหม่ได้หลายชั่วโมง
- ปุ่มเรียก `refreshSeasonCache(seasonId)`: `updateTag` ของ `seasons/list`,
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
| เพิ่ม source (dub ใหม่)         | กรณีปกติ: บันทึกแล้วรัน Import command                                                                                                                                                     |
| ลบ source                       | track ภาษานั้นที่ import แล้ว**ยังอยู่**และเล่นได้ (track ไม่ผูกกับ sources) → เตือน                                                                                                       |
| เปลี่ยน path ของ primary source | ตรวจซ้ำกับ season อื่นแบบ `createSeason` (ยกเว้นตัวเอง) และต้องมีอยู่จริง                                                                                                                  |
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
  ของ source และ ปุ่ม Import command (`ImportCommandModal` ใช้ร่วมกับหน้า season)

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

- season ที่ยังไม่ import: ตาราง episodes ว่าง → "No episodes yet. Run the import
  command."
  - ปุ่ม Import command
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
