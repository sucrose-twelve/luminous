# Control Panel (Same as the Admin panel)

> Design & Writing...

Control Panel จะใช้ได้บน Desktop >= 1440px เท่านั้น แต่ถ้าเปิดบน Desktop แล้วย่อขนาดลง
ให้ซ้อน layout หรือไม่ render แล้วเปิดกล่องข้อความแจ้งเตือนขนาดหน้าจอ (คลายกับหน้า
`/watch`)

`src/app/controls/layout.tsx` ให้ตรวจว่า `accounts.role` ต้องเป็น `root` หรือ `admin`
เท่านั้น และทั้ง 2 roles นี้ก็จะไม่สามารถเข้าใช้งานหน้าอื่นๆนอก `/ctrl` ได้เช่นกัน

> Page layout `docs/design/controls/page-layout.png`

- Search จะส่งไปที่ `/ctrl/seasons?search={contents.searchText}`

## Pages

ทุกๆหน้าจะอยู่ภายใน Folder `src/app/controls/`, และใช้ Nestjs `rewrites` เพิ่มเปลี่ยน
prefix url -> `/ctrl`

- Contents
- Seasons
- Accounts

### Pathname

| Pathname                                       | Description                                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/ctrl/contents`                               | แสดงรายการ contents                                                                 |
| `/ctrl/contents/[contentId]`                   | แสดงรรายละเอียอดของ content และรายการ seasons ทั้งหมดที่อยู่ภายใต้ `contentId` นั้น |
| `/ctrl/seasons`                                | แสดงรายการ seasons ทั้งหมดโดยไม่ขึ้นกับ `contentId`                                 |
| `/ctrl/seasons/[seasonId]`                     | แสดงรายละเอียอดของ season และรายการ episodes ทั้งหมดที่อยู่ภายใต้ `seasonId` นั้น   |
| `/ctrl/seasons/[seasonId]/episode/[episodeId]` | แสดงรายละเอียอดของ episode และรายการ tracks ทั้งหมดที่อยู่ภายใต้ `episodeId`        |

**การแบ่ง display columns**: ด้านซ้าย(`-L`) จะเป็นแบบ content-page-view grow,
ส่วนด้านขาว(`-R`) คือ stick panel ความกว้างคงที่ 320px

**Table head**: `docs/design/controls/table-head.png`

- "@keyline-icons/react/two-tone"
- size: 14px; stroke-width: 1.5;
- asc `ArrowDownUp2`
- desc `ArrowDownUp3`
- ทุกหน้าที่มีตาราง จะใช้ pagination แบบเดียวกับหน้า `/browse`

**Seasons tabel columns**: poster + title + seasonNo, kind, status & releasedOn; ที่
column แรกจะใช้ดีไซน์คลายกับ `docs/design/watch-history/00-list-view.png`
และเมื่อคลิกจะลิงก์ไปที่ `/ctrl/seasons/[seasonId]`

#### Page `/ctrl/contents`:

- column `-R`: คือ filters panel
- filters: `contents.kind`, `contents.genres` (ต้องกด Apply เท่านั้น)
- ปุ่มสำหรับสร้าง content (เมื่อกดจะเปิด Modal)
- Tabel columns: title, kind, source, genres & action button
- เมื่อคลิกที่ title จะลิงก์ไปที่ `/ctrl/contents/[contentId]`

#### Page `/ctrl/contents/[contentId]`:

- column `-R`: จะแสดง content detail แบบเต็มประกอบด้วย (id, slug, title, altTitles, kind,
  source, genres, sourceDir)
- ปุ่มสำหรับแก้ไข content (เมื่อกดจะเปิด Modal)
- ปุ่มสำหรับสร้าง season (เมื่อกดจะเปิด Modal)
- `contents.slug` จะไม่สามารถแก้ไขได้ แต่ถ้าเปลี่ยน `contents.title` ก็จะสร้าง `slug`
  ให้ใหม่ด้วย
- [Seasons tabel columns]
- ด้านบนตารางจะมีแถบ filters panel (คล้ายกับหน้า `/watch-histories`)
  ตัวกรอง(`seasons.kind` & `seasons.status`)

#### Page `/ctrl/seasons`:

- column `-R`: คือ filters panel (จะมีรายการที่ filters ได้แบบเดียวกับหน้า `/browse` (ตัด
  release year ออก) อยากให้เขียนแยกกัน เพราะในนี้จะต้องกดเลือกได้ทุก options
  แม้จะไม่มีข้อมูล)
- [Seasons tabel columns]

#### Page `/ctrl/seasons/[seasonId]`:

- column `-R`: จะแสดง season detail แบบเต็มประกอบด้วย (poster + title + seasonNo, id,
  kind, status, releasedOn & sources)
- ปุ่มสำหรับแก้ไข season (เมื่อกดจะเปิด Modal)
- ปุ่มสำหรับคัดลอกคำสั่งที่ใช้กับ `tests/track.spec.ts` (ใส้ flag remux & force ไว้คู่เลย
  ค่อยไปลบเอาตอนจะรัน) หรือจะสร้างระบบ tasks/queues ขึ้นมาดี?
- Episodes tabel columns: episodeNo, title, kind, audio language, airedOn
- ด้านบนตารางจะมีแถบ filters panel (คล้ายกับหน้า `/watch-histories`)
  ตัวกรอง(`episodes.kind` & `audio language`)

#### Page `/ctrl/seasons/[seasonId]/episode/[episodeId]`:

- column `-R`: จะแสดง season/episode detail แบบเต็มประกอบด้วย season(poster + title +
  seasonNo, id, kind, status, releasedOn) episode(kind, title, episodeNo & skips)
- ปุ่มแก้ไข (เปิด Modal แก้ไข episode detail) ส่วนที่แก้ไขได้ `episodes.kind`,
  `episodes.title`, `episodes.synopsis`
- ปุ่มสำหรับถ่ายภาพ thumbnail ใหม่ (เปิด Modal เลือกเวลา) การเลือก track
  ให้ใช้เงื่อนไขเดียวกับ `tests/track.spec.ts`
- ปุ่มตั้งค่า skip (เปิด Modal, ตัวอย่าง `docs/design/controls/skip-editer.png`) ถ้าเลือก
  `skip.kind` เดิมจะเป็นการเขียนทับนะ
- Tracks tabel columns: language + isDubbed, size, duration, mimeCodec
- ด้านบนตารางจะมีแถบ filters panel (คล้ายกับหน้า `/watch-histories`) ตัวกรอง(`language`)

---
