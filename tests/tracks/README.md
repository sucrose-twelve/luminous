# Track import (`tests/track.spec.ts`)

สคริปต์ Bun สำหรับนำเข้าวิดีโอของซีซันหนึ่งจากดิสก์เข้า DB ในการรันครั้งเดียว: รีมักซ์เป็น fragmented MP4 (ถ้าสั่ง), เขียน `episodes` กับ `tracks`
แล้วสร้างภาพตัวอย่าง (thumbnail) และ sprite sheet ของทุกตอน

รันจาก root ของ repo:

```bash
bun tests/track.spec.ts --season 019a2b3c-…
bun tests/track.spec.ts --season 019a2b3c-… --remux --force
```

ซีซันต้องถูกสร้างไว้ก่อนแล้ว (ปุ่ม New season ในหน้า content ของ control panel `/ctrl/contents/[contentId]`) สคริปต์จะอ่านว่าไฟล์อยู่ที่ไหนจาก `seasons.sources`

## ตัวเลือก

| Flag | ค่า | ความหมาย |
|---|---|---|
| `--season` | UUID | ID ของซีซันที่จะนำเข้า (จำเป็น) |
| `--remux` | | แปลงไฟล์ที่ยังไม่ใช่ fragmented MP4 ให้เป็น fragmented MP4 (stream copy เร็วมาก), เข้ารหัสเสียงที่ไม่ใช่ AAC/Opus เป็น AAC และเปลี่ยน tag ของ HEVC เป็น `hvc1` ถ้าไม่ใส่ ไฟล์ต้องเป็น fragmented MP4 อยู่แล้ว |
| `--force` | | สร้าง thumbnail และ sprite sheet ใหม่แม้มีไฟล์อยู่แล้ว |

รันซ้ำได้อย่างปลอดภัย: `episodes` upsert ตาม `(seasonId, episodeNo)` และ `tracks` upsert ตาม `(episodeId, language)`

## แหล่งไฟล์ (`seasons.sources`)

แต่ละ source คือเสียงหนึ่งภาษาของซีซัน: `{ language, pathname, isDubbed }` ของซีรีส์ `pathname` คือโฟลเดอร์ ส่วนของ `movie` คือไฟล์ `.mp4`

```
<CONTENTS_SOURCE_DIR>/Frieren/1/01.mp4                เสียงต้นฉบับ source "<CONTENTS_SOURCE_DIR>/Frieren/1"
<CONTENTS_SOURCE_DIR>/Frieren/Thai Dub/1/01.mp4       เสียงพากย์ source "<CONTENTS_SOURCE_DIR>/Frieren/Thai Dub/1"
<CONTENTS_SOURCE_DIR>/SAO/Ordinal Scale.mp4           เสียงต้นฉบับของ movie นำเข้าเป็นตอนที่ 1
```

- **ต้นฉบับหรือพากย์ ดูจาก `isDubbed` เท่านั้น** ไม่ดูจากชื่อโฟลเดอร์ ถ้าตั้ง `isDubbed: false` ไว้ โฟลเดอร์ `Thai Dub/1` ก็ถือเป็นต้นฉบับ
- มีต้นฉบับ (`isDubbed: false`) ได้**ไม่เกิน 1** source และแต่ละภาษามีได้ source เดียว
- **ซีซันที่มีแต่เสียงพากย์ก็นำเข้าได้** เช่น `sources` มีแค่ `{ language: "th-TH", pathname: ".../Thai Dub/1", isDubbed: true }`
- **source หลัก** (`primarySource()` ใน `src/libs/media.ts`) คือต้นฉบับ หรือ source แรกในรายการถ้าไม่มีต้นฉบับ ใช้กำหนดโฟลเดอร์ของภาพ และ
  ต้องมีอยู่บนดิสก์ ถ้าไม่มี สคริปต์จะหยุดก่อนแก้ไขอะไร
- source อื่นที่ยังไม่มีบนดิสก์ (พากย์ที่ยังไม่ได้โหลด) จะถูกข้ามพร้อมคำเตือน
- พากย์ที่มีตอนน้อยกว่าต้นฉบับ (ยังพากย์ไม่จบ) ก็แค่ทำให้ตอนนั้นๆ มี track เพิ่มอีกหนึ่งภาษา พอพากย์ตอนใหม่ออกให้รันซ้ำ

## ชื่อไฟล์ตอน

ในโฟลเดอร์ จะนำเข้าเฉพาะไฟล์ที่ชื่อตรงรูปแบบนี้ (`EPISODE_FILE_PATTERN`) ตัวเลขข้างหน้าคือ `episodeNo` ไฟล์และโฟลเดอร์อื่น (เช่น `.original/`) ถูกข้าม

| ไฟล์ | `kind` | `title` |
|---|---|---|
| `01.mp4` | `regular` | `01` |
| `14 - SP1.mp4` | `special` | `SP - 01` |
| `14 - OVA1.mp4` | `ova` | `OVA - 01` |

ถ้ามีสองไฟล์ใน source เดียวกันที่ได้เลขตอนซ้ำกัน (เช่น `14.mp4` กับ `14 - SP1.mp4`) สคริปต์จะหยุดโดยไม่แก้ไขอะไร
ชื่อและ `kind` ของตอนมาจากไฟล์ต้นฉบับ ถ้าตอนนั้นไม่มีต้นฉบับจะใช้ของพากย์แทน

## ขั้นตอนการทำงาน

1. **ตรวจความพร้อม** เช็กว่ามี `ffmpeg` / `ffprobe` ใน PATH, โหลดซีซันจาก DB และหาโฟลเดอร์ภาพของซีซัน
2. **สแกน source** หาไฟล์ตอนของทุก source
3. **รีมักซ์** (เฉพาะ `--remux`) ตรวจทุกไฟล์ก่อน ถ้ามีไฟล์ที่ต้องเข้ารหัสวิดีโอใหม่ (Hi10P, MPEG-2, …) จะหยุดตั้งแต่ตอนนี้ แล้วค่อยรีมักซ์ทีละไฟล์
4. **อ่านไฟล์** อ่านทุกไฟล์ก่อนเขียน DB: codec string (RFC 6381), ขนาด, ความยาว, ความกว้าง/สูง, `initEnd` และดัชนี fragment
5. **เขียน DB** upsert `episodes` และ `tracks` ใน transaction เดียว
6. **สร้างภาพ** ของแต่ละตอน จากไฟล์พากย์ (`isDubbed: true` ภาษาแรกตามลำดับตัวอักษร) ก่อน ถ้าตอนนั้นไม่มีพากย์จึงใช้ไฟล์ต้นฉบับ ภาพชุดเดียวใช้ร่วมทุกภาษา
   และอัปเดต DB ทีละตอนทันทีหลังเขียนไฟล์
7. **ลบไฟล์สำรอง** (เฉพาะ `--remux`) ลบไฟล์ใน `.original/` ของซีซันนี้ เมื่อทุกขั้นตอนข้างบนสำเร็จแล้วเท่านั้น

การตรวจที่ล้มเหลวจะหยุดสคริปต์ก่อนถึงขั้นตอนที่แก้ไขไฟล์หรือ DB ไฟล์เสียไฟล์เดียวจึงไม่ทำให้ซีซันถูกนำเข้าแค่ครึ่งเดียว

### รีมักซ์ (`--remux`)

- ไฟล์ที่ต้องรีมักซ์คือไฟล์ที่ยังไม่ fragmented, มีเสียงที่ไม่ใช่ AAC/Opus หรือ HEVC ที่ tag เป็น `hev1`
- เก็บไว้แค่ video และ audio stream แรก เสียงที่เข้ารหัสใหม่คง channel layout เดิม (5.1 ก็ยัง 5.1) ที่ 64 kb/s ต่อ channel แต่ไม่ต่ำกว่า 192 kb/s
- เขียนลง `01.remux.mp4` ก่อน แล้วตรวจว่าเป็น fragmented และความยาวต่างจากเดิมไม่เกิน 1 วินาที จึงย้ายไฟล์เดิมไป `.original/01.mp4` และ
  เปลี่ยนชื่อไฟล์ใหม่เป็น `01.mp4`
- ถ้ามีขั้นตอนไหนล้มเหลว ไฟล์เดิมจะยังอยู่ใน `.original/` ให้กู้คืนได้ การรัน `--remux` ที่สำเร็จครั้งถัดไปจะลบให้
- ไฟล์ที่ต้องเข้ารหัสวิดีโอใหม่ ให้รัน ffmpeg เอง เช่น
  `ffmpeg -i in.mkv -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +frag_keyframe+empty_moov+default_base_moof -min_frag_duration 4000000 01.mp4`

### ภาพ (thumbnail และ sprite sheet)

ภาพสร้างจากไฟล์พากย์ (`isDubbed: true`) ก่อนเสมอ ถ้าตอนนั้นมีหลาย source ส่วนตอนที่มีแต่ต้นฉบับจะใช้ไฟล์ต้นฉบับ

โฟลเดอร์ภาพคือ `<contents.sourceDir>/Thumbnails/<name>/` (`seasonArtDirectory()` ใน `src/libs/media.ts`) คิดจาก source หลัก ไม่ใช่จากไฟล์ที่ใช้สร้างภาพ

| ประเภทซีซัน | โฟลเดอร์ภาพ |
|---|---|
| `season` | `Thumbnails/<seasonNo>` ไม่ว่า source จะอยู่ที่ `1` หรือ `Thai Dub/1` |
| `movie` | `Thumbnails/<ชื่อไฟล์ไม่รวม .mp4>` |
| `spinoff` / `special` | `Thumbnails/<โฟลเดอร์แรกใต้ sourceDir>/<seasonNo>` เช่น `Thumbnails/Alternative Gun Gale Online/1` |

- **`<NN>.webp`** ขนาด 640×360 ถ่ายเฟรมที่ 30 วินาทีหลังจบ intro ถ้าตอนนั้นมี skip ของ intro ไม่งั้นที่ 25% ของความยาว ไฟล์ที่มีอยู่แล้วจะถูกเก็บไว้
  (อาจเลือกภาพเอง) เว้นแต่ใส่ `--force`
- **`<NN>-sprite-sheet.webp`** tile ขนาด 192×108 ทุก 10 วินาที 10 คอลัมน์ ถ้าแผ่นสูงเกินขีดจำกัดของ WebP (16,383 px) จะเพิ่มช่วงทีละ 5 วินาที
  sprite ที่มีอยู่จะสร้างใหม่เมื่อ grid ไม่ตรงกับใน DB หรือใส่ `--force`
- **track ที่ใช้ทำภาพเปลี่ยน** สร้างทั้งสองภาพใหม่โดยไม่ต้องใส่ `--force`: ก่อน upsert สคริปต์อ่านภาษาของ track ที่ตอนนั้นมีอยู่ใน DB
  ถ้าตอนนั้นมี track อยู่แล้วแต่ยังไม่มีภาษาของ track ที่ใช้ทำภาพรอบนี้ แปลว่าภาพเดิมทำจาก track อื่น เช่น ต้นฉบับมี 10 ตอน พากย์มี 6 ตอน
  ภาพ EP7–10 ทำจากต้นฉบับ พอพากย์ EP7 มาแล้วรันซ้ำ EP7 จะได้ภาพใหม่จากพากย์ (thumbnail ที่เลือกเองของตอนนั้นจะถูกแทนด้วย)
  ส่วนพากย์ที่หายจากดิสก์ชั่วคราวไม่ทำให้สร้างภาพใหม่ เพราะต้นฉบับมีอยู่ใน DB แล้ว

หลังรันเสร็จ server ที่เปิดอยู่จะยังใช้ path ของภาพที่ cache ไว้ จนกว่า `cacheLife("hours")` หมดอายุหรือรีสตาร์ต

## โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `tests/track.spec.ts` | Entry: อ่าน argument, โหลดซีซัน และสั่งแต่ละขั้นตอนตามลำดับ |
| `tracks/validator.zod.ts` | Zod schema ของ argument (`argsValidator`) |
| `tracks/constants.ts` | ค่าที่ปรับได้: รูปแบบชื่อไฟล์, codec ที่ copy ได้, ขนาดภาพ, ช่วงของ sprite, ค่าเผื่อความยาวตอนรีมักซ์ |
| `tracks/source.ts` | หาไฟล์ตอนของ source แต่ละอัน (`findSourceFiles`) |
| `tracks/ffprobe.ts` | อ่านความยาวและ stream ของไฟล์ |
| `tracks/ffmpeg.ts` | เช็กเครื่องมือ, วางแผนและรันการรีมักซ์, ลบไฟล์สำรอง (เขียน WebP อยู่ `src/libs/ffmpeg.ts` ใช้ร่วมกับ control panel) |
| `tracks/mp4.ts` | อ่าน box ของ MP4 (`moov`, `moof`) หา `initEnd`, codec และดัชนี fragment โดยไม่โหลดทั้งไฟล์ |
| `tracks/codec.ts` | สร้าง codec string แบบ RFC 6381 (`avc1.640028`, `hvc1.1.6.L93.B0`, `mp4a.40.2`) จาก `stsd` |
| `tracks/thumbnail.ts` | เลือกวินาทีที่ถ่าย thumbnail (ตัวถ่ายคือ `writeThumbnail` ใน `src/libs/ffmpeg.ts`) |
| `tracks/sprite.ts` | คำนวณ grid และสร้าง sprite sheet |
| `tracks/utils.ts` | แปลง path, เติมเลขตอนเป็น 2 หลัก, อ่าน box header และข้อความ error |

ใช้ `primarySource()` และ `seasonArtDirectory()` จาก `@/libs/media` ร่วมกับฝั่ง server และ log ผ่าน `logger()` จาก `@/libs/logger`

## หมายเหตุ

- **ต้องมี ffmpeg และ ffprobe ใน PATH** ใช้ทั้งการอ่านไฟล์ รีมักซ์ และสร้างภาพ
- **codec วิดีโอที่ copy ได้**: H.264 (8-bit 4:2:0 เท่านั้น), HEVC, AV1, VP9 อย่างอื่นต้องเข้ารหัสใหม่เอง
- **HEVC เล่นได้ไม่ทุกเบราว์เซอร์** Firefox ส่วนใหญ่เล่นไม่ได้ และ Safari เล่นได้เฉพาะเมื่อ tag เป็น `hvc1`
- **path ทุกอันใน DB** เป็น absolute path แบบ forward slash เช่น `<CONTENTS_SOURCE_DIR>/Frieren/1/01.mp4`
