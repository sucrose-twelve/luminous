# แก้ไขดีไซน์ Lumine Media Player (LMP)

> Design Ref: `docs/design/LMP.png`

ยกเลิกการใช้งาน HeroUI ทั้งหมดใน LMP, Button และ Pannel/Box มี border-gradient
ทุกปุ่มไม่มี outline (เขียน globals style ไว้ก็ได้)

เพิ่ม generateMetadata

title: "EP 01 • season.title • content.title"

เกี่ยวกับ season title ถ้ามี `seasons.title` แสดง `${seasons.title} (S1)`
แต่ถ้าไม่มีให้แสดง `Season 1`

---

## Icons

`lmp/icons`

| Button              | Icons                        |
| ------------------- | ---------------------------- |
| Back                | `<ChevronLeftIcon />`        |
| Playlist            | `<ListVideoIcon />`          |
| Preferences         | `<MoreVerticalIcon />`       |
| Autoplay Nect       | `<CircleProgressPlayIcon />` |
| Auto Skip           | `<FastForwardIcon />`        |
| Stable Volume       | `<AudioLinesIcon />`         |
| Play                | `<PlayIcon />`               |
| Pause               | `<PauseIcon />`              |
| Stop                | `<StopIcon />`               |
| Replay              | `<ReplayIcon />`             |
| Backward 10 seconds | `<Backward10sIcon />`        |
| Forward 10 seconds  | `<Forward10sIcon />`         |
| Prev                | `<SkipBackIcon />`           |
| Next                | `<SkipFrowardIcon />`        |

- Stable Volume แสดงปุ่มไว้แต่ยังไม่ทำ action

---

## Volume

ไม่มี slide-bar อีกต่อไป การเพิ่ม/ลดเสียงใช้ผ่าน shortcuts เท่านั้น การกดปุ่มคือ เปิด/ปิด
เสียง

- > 50% `<VolumeIcon />`
- < 50% `<VolumeLowIcon />`
- mute `<VolumeOffIcon />`

---

## Picture In Picture

ไม่มี toggle icon แล้วใช้อันเดียว

- `<PictureInPictureIcon />`

---

## Fullsreen

Mobile เมื่อเปิดเข้ามาแล้วให้ Default Fullsreen Mode ทันที

- Fullsreen `<MaximizeIcon />`
- Fullsreen exit `<MinimizeIcon />`

---

## Playlist Drawer

ให้สร้างขึ้นมาใหม่โดนใช้ `framer-motion`

- desktop: placement right
- mobile: placement bottom

ShortcutHelp ให้ใช้ Drawer เดียวกัน

---

## Preferences Switch

ให้สร้างขึ้นมาใหม่โดนใช้ `framer-motion`

---

ยกเลิก DoubleTap บน mobile

---

## ผลการทำ (✅ 2026-10-22)

ไฟล์ (`lmp/` = `src/app/(protected)/watch/components/lmp/`)

- ใหม่: `lmp/controls/playback-controls.tsx` (ปุ่มกลางจอ), `bottom-bar.tsx` (เวลา +
  progress), `switch.tsx`, `volume-button.tsx`, `lmp/overlays/drawer.tsx`,
  `lmp/playlist/playlist-drawer.tsx` (แทน `playlist-panel.tsx`),
  `lmp/hooks/use-mobile-fullscreen.ts`, `lmp/motion-features.ts`,
  `src/styles/components/border-gradient.css`
- ลบ: `audio-menu.tsx`, `player-menu.tsx`, `control-bar.tsx`, `volume-control.tsx`,
  `use-double-tap.ts`, `double-tap-ripple.tsx`, keyframes `slide-in-right`
- แก้: ปุ่มและ overlay ทุกตัวใน `lmp/`, `lmp.tsx`, `lmp-session.tsx`, `watch/page.tsx`
  (`generateMetadata`), `watch/utils.ts` (`watchTitle`), `stores/player/state.ts`
  (`stableVolume`), `src/libs/language.ts` (`languageName`), `src/components/icons` (เพิ่ม
  `CloseIcon` ให้ปุ่มปิด drawer), `globals.css`, skill `video-streaming.md`

ตามสเปก

- **ไม่มี HeroUI ใน LMP แล้ว** ปุ่มเป็น `<button>` ธรรมดา tooltip ใช้ `title` ไอคอนจาก
  `lmp/icons` ทั้งหมด (เหลือ Hugeicons แค่ไอคอนเตือนใน `playback-error.tsx`
  และการ์ดตอนที่ใช้ร่วมกับหน้า content)
- **`border-gradient`**: เส้นขอบ 1px สว่างที่มุมขวาบนแล้วจางไปซ้ายล่าง วาดด้วย
  `::before` + `mask` จึงใช้กับพื้นโปร่ง + blur ได้ ใช้กับปุ่มกลม, popover, drawer, toast,
  การ์ดจบตอน, ปุ่ม Skip, preview
- **ไม่มี outline**: กฎ `.lmp :where(button, a, [tabindex])` ใน `globals.css` (เป็น
  outline โปร่งใส จึงยังเห็นในโหมด forced-colors) focus
  จากคีย์บอร์ดแสดงด้วยพื้นสว่างขึ้น + ขอบสว่างขึ้นแทน
- Layout ตาม `LMP.png`: บนซ้าย Back + ชื่อเรื่อง + `Season 1 • Episode 01`, บนขวา Volume /
  PiP / Fullscreen / Playlist / Preferences, กลางจอ −10 / Prev / Play / Next / +10, ล่าง
  เวลา + progress, toast (OSD) กลางบน
- Volume: ไม่มี slider และ wheel แล้ว ปรับด้วย ↑ / ↓ (+ toast) ปุ่มคือ mute ไอคอน: mute
  หรือ 0 → `VolumeOffIcon`, ≤ 50 % → `VolumeLowIcon`, > 50 % → `VolumeIcon`
- PiP ไอคอนเดียว (label ยังบอกว่าเข้า / ออก), Fullscreen `MaximizeIcon` / `MinimizeIcon`
- Drawer (framer-motion) ใช้ร่วม Playlist กับ ShortcutHelp: desktop (`lg` ขึ้นไป) จากขวา,
  เล็กกว่านั้นจากล่าง อยู่ใน container ของ player จึงใช้ได้ตอน fullscreen เป็น modal: คลิก
  backdrop / Escape / ปุ่ม ✕ ปิด, Tab วนอยู่ใน drawer, ปิดแล้ว focus คืนปุ่มที่เปิด
- Switch (framer-motion): knob เด้งแบบ spring สีเปลี่ยนแบบ fade โหลด framer-motion ผ่าน
  `LazyMotion` (features แยก chunk) และ `MotionConfig reducedMotion="user"`
- มือถือ (`(hover: none) and (pointer: coarse)`) เข้า fullscreen เอง: ลองตอน mount
  (เปิดจากลิงก์ในแอปมักยังนับเป็น user gesture) ถ้าเบราว์เซอร์ไม่ยอม (รีโหลด / โหลดช้า)
  เข้าตอนแตะ player ครั้งแรก แล้วล็อกแนวนอน ออกจาก fullscreen เองแล้วไม่บังคับซ้ำ
- ยกเลิก DoubleTap: แตะ = แสดง / ซ่อน controls ปุ่ม ±10 แสดงทุกขนาดจอ
  และพื้นที่ว่างของแถบบน / ล่าง ไม่ดักการแตะแล้ว (เฉพาะปุ่มกับ progress ที่รับ pointer)
- `generateMetadata`: `EP 01 • Season 1 • ชื่อเรื่อง` /
  `EP 01 • ชื่อ season (S2) • ชื่อเรื่อง` (special เป็น `(SP)`, movie ไม่มีส่วน EP
  และไม่ใส่ `(S1)`, ส่วนที่ซ้ำกับชื่อเรื่องถูกตัด) ต่อท้ายด้วย template ` • Luminous • …`
  เหมือนหน้าอื่น บรรทัดรองของ top bar ใช้ชื่อ season แบบเดียวกัน

ตัดสินเองระหว่างทำ (แก้ได้)

- **Audio Language ย้ายเข้า Preferences** ตามดีไซน์ ปุ่ม Audio Tracks เดิมถูกลบ ชื่อเป็น
  `Japanese (日本語)` / `Thai (ไทย)` (ดีไซน์เขียน `日本` แต่ endonym จริงคือ `日本語`)
  ไม่มีคำว่า Original แล้ว ซ่อนส่วนนี้เมื่อตอนนั้นมีเสียงเดียว
- **คงแถว Keyboard shortcuts (Shift+/) ท้าย Preferences** แม้ดีไซน์ไม่มี
  เพราะเสียงปรับได้ทางคีย์บอร์ดอย่างเดียวแล้ว
- **Stable Volume**: สวิตช์กดได้และจำค่าต่ออุปกรณ์ (`stableVolume` ใน `stores/player`,
  persist) แต่ยังไม่มีผลกับเสียง (`notes/lmp-stable-volume-plan.md`)
- Progress ส่วนที่เล่นแล้วเป็นสีขาวตามดีไซน์ (ช่วง skip ยังเป็นสี theme จาง)
- ปุ่ม Play กลางจอ: Pause ระหว่างเล่น, `ReplayIcon` หลังจบตอน → การ์ดจบตอนไม่มีปุ่ม Replay
  กลางจอของตัวเองแล้ว, `StoppedOverlay` เหลือแค่ poster และตอน autoplay ถูกบล็อกใช้ปุ่ม
  Play กลางจอแทนปุ่มใหญ่เดิม (`isBlocked` ถูกลบจาก controller)
- ไม่ได้ใช้ `StopIcon` เพราะดีไซน์ไม่มีปุ่ม Stop (ยังเป็น Shift+S)
- การ์ด Up next: thumbnail, `Up next in 5s`, ชื่อตอนบรรทัดเล็ก, Play now / Cancel
  (วงแหวนนับถอยหลังเดิมถูกตัด)
- Preferences เป็น disclosure: focus อยู่ที่ปุ่ม Tab เข้า popover ต่อได้ Escape ปิด (focus
  กลับปุ่ม) คลิกข้างนอกปิด ผ่านชั้นโปร่งใส (แตะนั้นไม่ซ่อน controls ไปด้วย) ใน popover กด
  Space = play / pause เหมือนทุกที่ ใช้ Enter สลับสวิตช์
- ตัวเลือก season ใน Playlist เป็นปุ่ม chip แทน select เปิด / ปิด drawer ไม่ซ้อนกัน
  (Preferences, ปุ่มลัด, Playlist เปิดได้ทีละอัน)

ผลทดสอบ (headless Chrome ผ่าน CDP, `bun run start:dev`)

- 1424×659: layout, popover (มี / ไม่มี Audio Language), Playlist drawer ขวา,
  รายการปุ่มลัด, toast `Volume 95%`, hover preview, การ์ด Up next (นับ → Cancel → Replay),
  ปุ่ม Replay กลางจอหลังจบ, Stop (poster + Play), title
  `EP 06 • Season 2 • Maou Gakuin no Futekigousha • Luminous • …`
- 844×390 แบบสัมผัส: drawer จากล่าง, เข้า fullscreen ตอนแตะครั้งแรก (โหลดหน้าตรงไม่มี
  gesture), แตะ = แสดง / ซ่อน controls ระหว่างเล่น / 390×844: top bar ตัดชื่อ, ปุ่มไม่ล้น
- Stable Volume เขียนลง `localStorage` (`lmp:player`), Escape ปิดทีละชั้น, ปิด Playlist
  แล้ว focus กลับปุ่ม Playlist, ไม่มี error ใน console, `bun run build` ผ่าน
- ยังไม่ได้ทดสอบ: มือถือจริง (Android / iPhone), Safari, Firefox, PiP ข้ามตอนหลังเปลี่ยน
  UI
