# LMP Stable Volume — แผนงาน

> เขียนเมื่อ 2026-10-21 · รอบ 1 · สถานะ: แผน ยังไม่ได้ลงมือ (รอคำตอบ §11)
>
> เกี่ยวข้อง: `notes/lumine-media-player.md` §5.3 (`stores/player/`), §6.6 (Volume /
> Mute), §6.10 (popover Preferences), §15 (การตรวจ) · ดีไซน์ `docs/design/01-Actions.png`
> (popover Preferences)
>
> **2026-10-22 (`notes/new-lmp-spec.md`)**: UI เปลี่ยนแล้ว ไม่มี volume slider (ปรับด้วย ↑ / ↓ อย่างเดียว,
> `VolumeControl` → `VolumeButton` ปุ่ม mute อย่างเดียว, `isVolumeSettable()` ถูกลบ) สวิตช์ Stable Volume
> อยู่ใน popover Preferences ใหม่ (`controls/preferences-menu.tsx`, ดีไซน์ `docs/design/LMP.png`) และ
> `stableVolume` อยู่ใน `stores/player` แล้ว (persist, ค่าเริ่ม `false`) แต่ยังไม่มีผลกับเสียง → ขั้น 1 (store)
> และขั้น 4 (สวิตช์) ของ §7 เสร็จ ส่วนที่พูดถึง slider ใน §3 / §4 / §10 ให้อ่านเป็น ↑ / ↓

## 0. Context

Stable Volume ของ YouTube คือ **dynamic range compression (DRC) แบบ real-time**:
ลดเสียงช่วงที่ดังเกิน (ฉากต่อสู้, OP/ED) และยกช่วงที่เบา (บทพูดกระซิบ)
ให้ฟังได้ทั้งตอนโดยไม่ต้องคอยปรับ volume มันคนละอย่างกับ **Loudness Normalization**
("Content loudness" ใน Stats for nerds) ที่ปรับความดังเฉลี่ยของทั้งคลิปให้เท่ากัน

ใน Luminous เจอทั้งสองปัญหา: anime บทพูดเบาแต่ OP/ED กับฉากแอ็กชันดัง (แก้ด้วย DRC =
เฟส 1) และพากย์ไทยกับ ต้นฉบับดังไม่เท่ากัน (แก้ด้วย normalization = เฟส 2 §8)

ตอนนี้ LMP เล่นเสียงตรงจาก `<video>` ไม่ผ่าน Web Audio เลย `volume` / `muted` มี `<video>`
เป็นเจ้าของ และ `<Lmp>` คัดลอกเข้า store ผ่าน `volumechange` (`lmp.tsx`)

**เป้าหมาย**: สวิตช์ "Stable Volume" ใน popover Preferences เปิดแล้วเสียงผ่าน
`DynamicsCompressorNode` ทันทีโดย ไม่สะดุด ปิดแล้วได้เสียงเดิม จำค่าต่ออุปกรณ์ slider
volume ทำงานถูกทุกกรณี PiP / fullscreen / ข้ามตอน / สลับเสียงพากย์ / Media Session ไม่พัง
และ **ถ้าไม่เคยเปิด เส้นทางเสียงต้องเหมือนเดิม 100%** (ไม่สร้าง `AudioContext`)

**นอกขอบเขตเฟส 1**: loudness normalization ต่อ track (§8), EQ / voice boost, ปรับค่า
compressor จาก UI

## 1. ข้อเท็จจริงที่ใช้ออกแบบ (ตรวจแล้ว 2026-10-21)

| เรื่อง                         | ข้อเท็จจริง                                                                                                                                                                                        | ผลต่อแผน                                                                                                                                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createMediaElementSource()`   | เรียกได้ **ครั้งเดียวต่อ element** หลังจากนั้นเสียงของ element ออกทาง graph อย่างเดียว ถอดกลับเป็น native ไม่ได้                                                                                   | สร้าง graph ใน `<Lmp>` (ส่วนที่อยู่ตลอดการเข้า `/watch` และถือ `<video>` ตัวเดียว) ไม่ใช่ใน `LmpSession` ปิดฟีเจอร์ = เฟดไปทาง dry ไม่ใช่ถอด graph                                                                                                  |
| Autoplay policy                | spec: context เริ่ม `running` ได้เมื่อหน้ามี sticky activation (Safari เข้มกว่า) ถ้า context เป็น `suspended` หลังต่อ graph แล้ว **วิดีโอจะเล่นแต่เงียบ**                                          | สร้าง context ใน user gesture เท่านั้น และ `resume()` ที่ gesture ถัดไปถ้ายังไม่ `running` (§5)                                                                                                                                                     |
| `volume` / `muted` ของ element | WPT `mediaElementAudioSource_volumeChange.html` กำหนดให้ output ของ source node สะท้อน `volume` / `muted` คือถูกคูณ **ก่อน** เข้า graph แต่เคยมี browser ที่ไม่ทำตาม (Firefox bug 944924 สมัยก่อน) | ถ้าปล่อย volume ไว้ที่ element จะมี 2 ปัญหา: (1) ลด volume ช่วงเสียงดังแล้วแทบไม่เบาลง เพราะ compressor ดึงกลับ (ratio 6: ลด 6 dB ได้ยินลด ~1 dB) (2) browser ที่ไม่คูณจะทำให้ slider ไม่มีผล → **ย้าย volume ไปเป็น GainNode ท้าย graph** (§3, §4) |
| Makeup gain                    | spec กำหนด makeup gain อัตโนมัติ = (1 / fullRangeGain)^0.6 ไม่มีตัวปิด                                                                                                                             | ไม่ต้องใส่ GainNode ยกเสียงเอง peak 0 dBFS ออกมาที่ fullRangeGain^0.4 < 1 จึงไม่ clip ในสภาวะคงที่                                                                                                                                                  |
| Channel                        | `DynamicsCompressorNode` มี `channelCount` ≤ 2 (`clamped-max`)                                                                                                                                     | ทาง compressor เป็น stereo เสมอ (track 5.1 ถูก downmix) ทาง dry ตั้ง `destination.channelCount = maxChannelCount` ให้ 5.1 ยังออกได้ตอนปิดฟีเจอร์                                                                                                    |
| iOS / iPadOS Safari            | มีรายงานว่า context ถูก suspend หรือเป็น `"interrupted"` เมื่อล็อกจอ / ไป background (รวมตอนเล่นใน PiP) และ `resume()` ต้องรอ gesture รายงานยังขัดกันว่า iOS รุ่นล่าสุดแก้แล้วหรือยัง              | เฟส 1 **ไม่แสดงสวิตช์** บนอุปกรณ์ที่ `isVolumeSettable()` เป็น false (iOS) ถาม §11 Q3                                                                                                                                                               |
| Same-origin                    | graph ได้ข้อมูลเสียงเฉพาะ media ที่ same-origin หรือผ่าน CORS ไม่อย่างนั้นได้ความเงียบ                                                                                                             | `/api/stream/[vid]` (native fallback) และ Object URL ของ MSE เป็น origin เดียวกัน ไม่ต้องทำอะไร                                                                                                                                                     |

## 2. ประสบการณ์ผู้ใช้

ตาม `docs/design/01-Actions.png` เพิ่มสวิตช์ตัวที่ 3 ใต้ Auto Skip:

```
┌────────────────────────────────┐
│ ⚟  Preferences                 │
│ ────────────────────────────── │
│ Autoplay Next           [ ●━]  │   ← บัญชี (preferences table)
│ Auto Skip               [━○ ]  │   ← บัญชี
│ Stable Volume           [ ●━]  │   ← ใหม่: อุปกรณ์นี้ (store, localStorage)
│ ────────────────────────────── │
│ ⌨  Keyboard shortcuts  Shift+/ │
└────────────────────────────────┘
```

- **เก็บต่ออุปกรณ์** เหมือน `volume` / `muted` เพราะลำโพงทีวีกับหูฟังต้องการค่าต่างกัน
  (§11 Q4)
- กดแล้วมีผลทันที เฟดข้าม ~150 ms ไม่มีเสียงคลิก ไม่มี OSD เพราะสวิตช์บอกสถานะอยู่แล้ว
- ค่าเริ่มต้น **ปิด** (§11 Q1) · ไม่มีปุ่มลัด (§11 Q2) · ข้อความ UI ภาษาอังกฤษ
  `Stable Volume`
- ซ่อนสวิตช์เมื่อไม่รองรับ: ไม่มี `AudioContext` หรือ `isVolumeSettable()` เป็น false
  (iOS)

## 3. Audio graph

```
<video> ─ source ─┬─ dry (Gain 1|0) ──────────────────┬─ output (Gain = muted ? 0 : volume) ─ destination
                  └─ compressor ─ wet (Gain 0|1) ─────┘
```

- **`output`** คือ volume ของผู้ใช้ อยู่หลัง compressor ระหว่างที่มี graph `video.volume`
  ถูกตรึงไว้ที่ `1` ส่วน `video.muted` ยังตั้งที่ element (ปุ่ม mute ในหน้าต่าง PiP / OS
  จะได้แสดงถูก) และคูณ 0 ใน `output` ด้วยเผื่อ browser ที่ไม่ใช้ `muted` ก่อนเข้า graph
- **เปิด / ปิด** = เฟด `dry` ↔ `wet` ด้วย `setTargetAtTime` (time constant 0.05 s) ไม่
  `disconnect()` ไม่มีเสียงคลิก
- **volume** เปลี่ยนด้วย `setTargetAtTime` (time constant 0.015 s) ลาก slider
  แล้วไม่มีเสียงแตก (zipper noise)
- `new AudioContext()` ใช้ `latencyHint` ค่าเริ่มต้น (`"interactive"`) ห้ามใช้
  `"playback"` เพราะเพิ่ม latency จนภาพกับเสียงไม่ตรงกัน (lip-sync)
- **ลำดับตอนสร้าง** ทำให้ไม่มีเสียงดังวูบ: สร้าง node โดยให้ `output.gain` = volume
  ปัจจุบัน และ `dry = 1`, `wet = 0` → ต่อ node → `createMediaElementSource()` → ตรึง
  `video.volume = 1` → เฟดไป `wet` ระหว่าง สร้าง source กับตรึง volume เสียงจะเป็น volume²
  (เบาลงชั่วครู่) ไม่มีทางดังขึ้น และเสียงตอนต่อเข้า graph ใหม่ๆ ผ่าน dry เท่ากับ native
  จึงไม่สะดุด
- ค่าเริ่มต้นของ compressor (จูนด้วยหูใน §7 ขั้น 5 แล้วบันทึกค่าจริงไว้ที่นี่):
  `threshold −30 dB`, `knee 10 dB`, `ratio 6`, `attack 0.005 s`, `release 0.3 s`

โครงของ `lmp/audio-graph.ts` (ฟังก์ชันล้วน ไม่ผูก React):

```ts
const COMPRESSOR: DynamicsCompressorOptions = {
  threshold: -30,
  knee: 10,
  ratio: 6,
  attack: 0.005,
  release: 0.3
}
const MIX_FADE = 0.05
const GAIN_FADE = 0.015

export type AudioGraph = {
  context: AudioContext
  dry: GainNode
  wet: GainNode
  output: GainNode
}

/**
 * Routes the element's sound through the graph, starting on the dry path at `gain`, so the switch from
 * native output is inaudible. Call it from a user gesture: a suspended context would play silence.
 */
export function createAudioGraph(video: HTMLVideoElement, gain: number): AudioGraph {
  const context = new AudioContext()
  const output = new GainNode(context, { gain })
  const dry = new GainNode(context, { gain: 1 })
  const wet = new GainNode(context, { gain: 0 })
  const compressor = new DynamicsCompressorNode(context, COMPRESSOR)

  context.destination.channelCount = context.destination.maxChannelCount
  output.connect(context.destination)
  dry.connect(output)
  compressor.connect(wet).connect(output)

  const source = context.createMediaElementSource(video)
  source.connect(dry)
  source.connect(compressor)
  video.volume = 1
  return { context, dry, wet, output }
}

export function setStableMix({ context, dry, wet }: AudioGraph, isStable: boolean) {
  dry.gain.setTargetAtTime(isStable ? 0 : 1, context.currentTime, MIX_FADE)
  wet.gain.setTargetAtTime(isStable ? 1 : 0, context.currentTime, MIX_FADE)
}

export function setOutputGain({ context, output }: AudioGraph, gain: number) {
  output.gain.setTargetAtTime(gain, context.currentTime, GAIN_FADE)
}
```

## 4. เจ้าของ volume (เปลี่ยนจากเดิม)

เดิม element เป็นเจ้าของ แล้ว `volumechange` คัดลอกเข้า store ใหม่ **store เป็นเจ้าของทั้ง
`volume` และ `muted`** แล้ว `use-audio-output` (ใน `<Lmp>`) นำค่าไปใช้ตามว่ามี graph
หรือยัง:

|                | ยังไม่มี graph (เหมือนวันนี้) | มี graph               |
| -------------- | ----------------------------- | ---------------------- |
| `video.volume` | `= volume`                    | `= 1` (ตรึง)           |
| `video.muted`  | `= muted`                     | `= muted`              |
| `output.gain`  | —                             | `= muted ? 0 : volume` |

- `setVolume` / `toggleMute` ใน `use-lmp-controller.ts` เขียน store
  (`usePlayerStoreApi().getState()`) แทน element กฎเดิมยังอยู่ครบ: ขั้น 5 %
  (`VOLUME_STEPS`), `v > 0` ขณะ mute → unmute, unmute ตอน volume 0 → 0.5
- `flashVolume` / `changeVolume` ใน `lmp-session.tsx` อ่านจาก store แทน `video.volume`
  (ระหว่างมี graph element เป็น `1` เสมอ)
- store → sink ใช้ `store.subscribe` (vanilla) ไม่ผ่าน React state จึงไม่ re-render
- `volumechange` จากภายนอก (ปุ่ม mute ในหน้าต่าง PiP, OS) คัดลอกกลับเข้า store:
  - `muted` → `setMuted(video.muted)` เสมอ
  - `volume` → ไม่มี graph: `setVolume(video.volume)` · มี graph: เฉพาะเมื่อ
    `video.volume !== 1` แล้วตรึงกลับ เป็น `1`
  - ไม่วนลูป: element ยิง `volumechange` เฉพาะเมื่อค่าเปลี่ยนจริง และการตรึง `1`
    ถูกข้ามด้วยเงื่อนไขข้างบน
- iOS (`isVolumeSettable()` เป็น false): `setVolume` ไม่เขียน store เพราะ element
  ไม่เปลี่ยนตาม ไม่อย่างนั้น OSD จะบอก "Volume 95%" ทั้งที่เสียงเท่าเดิม (วันนี้ค่าใน
  store ไม่เปลี่ยนเพราะไม่มี `volumechange`)
- `VolumeControl` อ่าน store อยู่แล้ว ไม่ต้องแก้

## 5. Lifecycle ของ `AudioContext` (`use-audio-output.ts`)

- **สร้างเมื่อ** `stableVolume === true` และยังไม่มี graph โดยต้องอยู่ใน user gesture
  (`navigator.userActivation?.isActive !== false`) มาได้ 2 ทาง:
  1. `stableVolume` เปลี่ยนเป็น `true` จากการกดสวิตช์: React Aria เรียก
     `onSelectionChange` ใน event ของการกด และ `store.subscribe` ทำงานแบบ synchronous
     จึงยังอยู่ใน gesture
  2. ค่าที่จำไว้เป็น `true` ตอนโหลดหน้า: ติด listener `pointerup` + `keydown` (capture) บน
     `window` ไว้จนกว่า จะสร้างได้ ครอบคลุมปุ่ม Play, overlay Play, Space, การแตะจอ
     (`pointerup` คือ activation-triggering event ของ touch ส่วน mouse ได้ activation
     ตั้งแต่ `pointerdown` และยังไม่หมดตอน `pointerup`)
- ก่อน gesture แรกเสียงยังออก native (ไม่ผ่าน compressor) เช่น autoplay ที่ browser อนุญาต
  หรือ Play จาก media key ของ OS ยอมรับได้ เพราะ graph จะถูกสร้างที่ gesture ถัดไป
- **Resume**: ฟัง `statechange` ถ้าไม่ใช่ `running` ให้ติด listener gesture อีกครั้งเพื่อ
  `resume()` และตอน `<video>` ยิง `playing` ถ้า context ไม่ `running` ให้ `resume()`
  ถ้ายังไม่ได้ภายใน 500 ms ให้ `video.pause()` ผู้ใช้จะเห็นปุ่ม Play แล้วกดใหม่ (=
  gesture) แทนที่จะดูแบบเงียบ บน desktop context ไม่ถูก suspend เองอยู่แล้ว
  ส่วนนี้เป็นตาข่ายกันพลาด
- **ปิดฟีเจอร์**: graph อยู่ต่อ เฟดไปทาง dry ห้าม `context.suspend()` เพราะ element
  ต่อเข้า graph แล้ว suspend = เงียบ
- **ออกจาก `/watch`** (`<Lmp>` unmount): `context.close()` คู่กับ cleanup เดิม
  (`removeAttribute("src")` + `load()`)
- ข้ามตอน / สลับเสียงพากย์: graph ไม่ต้องทำอะไร เพราะ `<video>` ตัวเดิม และ source node
  ตามเสียงของ `src` ใหม่เอง (MSE หรือ native fallback)

## 6. ไฟล์ที่จะสร้าง / แก้

| ไฟล์                                                     | งาน                                                                                                                                                                                                                                                |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/stores/player/state.ts`                             | เพิ่ม `stableVolume: boolean` (ค่าเริ่ม `false`) + `setStableVolume` ใส่ใน `partialize` และ `merge` (ตรวจ `typeof === "boolean"`) อัปเดต doc comment                                                                                               |
| `lmp/audio-graph.ts` (ใหม่)                              | `createAudioGraph`, `setStableMix`, `setOutputGain`, ค่าคงที่ compressor (§3) ระดับเดียวกับ `hotkeys.ts`                                                                                                                                           |
| `lmp/hooks/use-audio-output.ts` (ใหม่)                   | store → sink (§4), คัดลอก `volumechange` จากภายนอก, สร้าง graph ตอน gesture, resume, `close()` (§5)                                                                                                                                                |
| `lmp/lmp.tsx`                                            | แทน effect "Restore this device's volume…" ด้วย `useAudioOutput(videoRef)` อัปเดต doc ของ effect / component                                                                                                                                       |
| `lmp/hooks/use-lmp-controller.ts`                        | `setVolume` / `toggleMute` เขียน store (§4) แก้ doc "Only the element changes…"                                                                                                                                                                    |
| `lmp/lmp-session.tsx`                                    | `flashVolume` / `changeVolume` อ่าน store                                                                                                                                                                                                          |
| `lmp/controls/preferences-menu.tsx`                      | section ที่สอง `aria-label='Audio'` (`selectionMode='multiple'` เหมือนเดิม เมนูจึงไม่ปิดตอนกด) อ่าน/เขียน `stableVolume` จาก store โดยตรงเหมือน `VolumeControl` จึงไม่ต้องแก้ `ControlBar` แยกตัววาดสวิตช์เป็น component ในไฟล์ ใช้ทั้งสอง section |
| `lmp/controls/volume-control.tsx` → `lmp/utils.ts`       | ย้าย `isVolumeSettable()` ไป `utils.ts` (ย้าย ไม่ copy) ใช้ร่วมกับ preferences-menu และ controller                                                                                                                                                 |
| `notes/lumine-media-player.md`                           | §5.3 (state ใหม่), §6.6 (เจ้าของ volume), §6.10 (สวิตช์ที่ 3) ชี้มาที่ไฟล์นี้                                                                                                                                                                      |
| `.claude/skills/web-stack/references/video-streaming.md` | หัวข้อ "Player UI & preferences": เพิ่ม `stableVolume` ใน per-device settings และกฎของ graph (สร้างครั้งเดียวใน `<Lmp>`, ใน gesture, volume อยู่ท้าย graph)                                                                                        |

(`lmp/` = `src/app/(protected)/watch/components/lmp/`)

## 7. ลำดับการทำ

1. **Store + utils**: เพิ่ม `stableVolume` และย้าย `isVolumeSettable()`
2. **เปลี่ยนเจ้าของ volume โดยยังไม่มี graph** (§4):
   ทำเสร็จแล้วพฤติกรรมต้องเหมือนวันนี้ทุกอย่าง (slider, wheel, ↑/↓, Shift+M, ปุ่ม mute ใน
   PiP, reload แล้วจำค่า) แยกขั้นนี้ไว้ก่อนเพื่อแยก regression ออกจากงาน audio
3. **Graph**: `audio-graph.ts` + `use-audio-output.ts` (§3, §5)
4. **สวิตช์**ใน popover Preferences
5. **จูน compressor ด้วยหู**: เลือกฉากอ้างอิง 3 แบบ (บทพูดเบา, OP/ED, ฉากต่อสู้/ระเบิด)
   ทั้งเสียงญี่ปุ่นและพากย์ ไทย ฟังผ่านลำโพงและหูฟัง แล้วบันทึกค่าสุดท้ายใน §3
6. อัปเดต notes + skill reference, `bunx prettier --write` ไฟล์ที่แตะ, `bun run build`

## 8. เฟส 2 (ยังไม่ทำ): Loudness normalization ต่อ track

แก้ปัญหาพากย์ไทยดัง/เบากว่าต้นฉบับ และแต่ละตอนดังไม่เท่ากัน ซึ่ง compressor
แก้ได้แค่บางส่วน

- **วัดตอน import** (`tests/track.spec.ts` ขั้นอ่านไฟล์):
  `ffmpeg -i 01.mp4 -map 0:a:0 -af loudnorm=print_format=json -f null -` แล้วอ่าน
  `input_i` (LUFS) กับ `input_tp` (dBTP) จาก stderr ใช้เวลาไม่กี่วินาทีต่อตอน (decode
  เสียงอย่างเดียว)
- **Schema**: `tracks.loudness` (`loudness_lufs`, real) และ `tracks.truePeak`
  (`true_peak_dbtp`, real) เป็น nullable → `bun run drizzle:generate` / `drizzle:migrate`
  แล้ว import season เดิมใหม่ (upsert อยู่แล้ว)
- **Player**: GainNode `normalize` ระหว่าง `source` กับจุดแยก dry / wet:
  `gain = 10 ** ((TARGET - loudness) / 20)` โดย `TARGET = −16 LUFS` และจำกัดการยกเสียงให้
  `truePeak + gainDb ≤ −1 dBTP` ค่าเปลี่ยนตาม `props.track` (`<Lmp>` เห็น props
  ใหม่ทุกตอน) ด้วย `setTargetAtTime`
- ทำงานเฉพาะเมื่อเปิด Stable Volume (มี graph อยู่แล้ว) ถ้าจะให้ทำงานเสมอ
  ผู้ใช้ทุกคนต้องมี `AudioContext` และเจอเงื่อนไข autoplay ของ §5 (§11 Q5)

## 9. Edge cases

| กรณี                                                    | ผลที่ต้องได้                                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| เปิดสวิตช์ระหว่างเล่น                                   | เข้า graph ทาง dry แล้วเฟดไป wet ไม่มีเสียงสะดุดหรือดังวูบ                                                   |
| ปิดแล้วเปิดซ้ำหลายครั้ง                                 | ใช้ graph เดิม เฟดไปมา ไม่สร้าง context ใหม่                                                                 |
| ข้ามตอน (Next, autoplay next, Playlist), สลับเสียงพากย์ | เสียงยังผ่าน graph ไม่เงียบ (`<video>` ตัวเดิม)                                                              |
| Native fallback (`video.src = /api/stream/…`)           | ใช้ได้เหมือน MSE (same-origin)                                                                               |
| Stop (Shift+S), จบตอน, end card                         | ไม่มีผลกับ graph                                                                                             |
| PiP / tab อยู่เบื้องหลัง (desktop)                      | ยังมีเสียง ปุ่ม mute ในหน้าต่าง PiP ทำงานและไอคอนใน player ตรง                                               |
| Reload ตอนค่าที่จำไว้เป็น `true`                        | เสียง native จนถึง gesture แรก (ปกติคือกด Play) แล้วเข้า graph                                               |
| ตั้ง volume เป็น 0 ด้วย slider ตอนมี graph              | `output.gain = 0` ไอคอน mute (store เป็น 0)                                                                  |
| `new AudioContext()` throw                              | จับไว้ เสียงยังเป็น native สวิตช์ยังเปิดอยู่แต่ไม่มีผล (เกิดได้ยาก เพราะซ่อนสวิตช์เมื่อไม่มี `AudioContext`) |
| track 5.1                                               | ปิด: 5.1 ออกตามเดิมถ้าอุปกรณ์รองรับ · เปิด: stereo                                                           |
| iOS                                                     | ไม่มีสวิตช์ เสียงเหมือนวันนี้ทุกอย่าง                                                                        |

## 10. การตรวจ

ไม่มี automated test (ตามกฎ) ตรวจด้วย `bun run build` + ทดสอบมือบน `bun run start:dev` และ
`bun run start:prod` (LAN, มือถือ) ด้วยบัญชี `user@luminous.co` / `p4ssw02d`

- [ ] ไม่เคยเปิดสวิตช์: แท็บ WebAudio ใน Chrome DevTools ไม่มี context ถูกสร้าง
- [ ] หลังขั้น 2 (§7): slider, wheel, ↑/↓ + OSD, Shift+M, ปุ่ม mute ใน PiP, reload
      แล้วจำค่า เหมือนเดิมทุกอย่าง
- [ ] เปิดสวิตช์ระหว่างเล่น: ไม่สะดุด ไม่ดังวูบ แท็บ WebAudio เห็น graph ตาม §3 และ
      `state: running`
- [ ] ฉากอ้างอิง 3 แบบ (§7 ขั้น 5): ช่วงความดังแคบลงชัดเจน ไม่มีเสียงปั๊ม (pumping)
      หรือแตก (clip)
- [ ] volume 100 / 50 / 20 % ทั้งตอนเปิดและปิด: ลด volume ในช่วงเสียงดังแล้วเบาลงจริง
- [ ] Next, autoplay next, เลือกตอนจาก Playlist, สลับเสียงพากย์ → ยังมีเสียงและยังผ่าน
      compressor
- [ ] PiP + สลับไปแท็บอื่น ≥ 1 นาที ยังมีเสียง
- [ ] Reload ตอนเปิดไว้ → สวิตช์ยังเปิด เสียงเข้า graph หลังกด Play
- [ ] ภาพกับเสียงตรงกัน (lip-sync) ทั้งตอนเปิดและปิด
- [ ] Chrome / Edge / Firefox / Safari desktop และ Android Chrome บน LAN
- [ ] iOS: ไม่มีสวิตช์ และพฤติกรรมเหมือนเดิม
- [ ] `bunx prettier --write` ไฟล์ที่แตะ และ `bun run build` ผ่าน

## 11. คำถาม (ค่าในวงเล็บคือสิ่งที่จะทำถ้าไม่ได้คำตอบ)

1. **ค่าเริ่มต้นของสวิตช์** (ปิด): เปิดเป็นค่าเริ่มต้นจะทำให้ผู้ใช้ทุกคนมี `AudioContext`
   และเจอเงื่อนไข §5
2. **ปุ่มลัด** (ไม่มี): ถ้าต้องการ เสนอ `Shift+V` ซึ่งยังว่างใน `HOTKEYS`
   และขึ้นในหน้าต่างปุ่มลัดอัตโนมัติ
3. **iOS** (ซ่อนสวิตช์ในเฟส 1): ถ้าอยากให้มี ต้องทดสอบล็อกจอ / background / PiP บน iPhone
   จริงก่อน
4. **เก็บต่ออุปกรณ์หรือต่อบัญชี** (ต่ออุปกรณ์): ถ้าเป็นต่อบัญชี ต้องเพิ่มคอลัมน์ใน
   `preferences` และใช้ `updatePlaybackPreference` แบบ Autoplay Next
5. **เฟส 2 normalization** (ยังไม่ทำ ถ้าทำ จะให้ทำงานเฉพาะตอนเปิด Stable Volume)
6. **ชื่อบน UI** (`Stable Volume`)

## 12. อ้างอิง

- W3C Web Audio API 1.1 — `DynamicsCompressorNode` (ขั้นตอน makeup gain, `channelCount`
  constraints) และ `AudioContext` "allowed to start" (sticky activation):
  https://www.w3.org/TR/webaudio/
- WPT
  `webaudio/the-audio-api/the-mediaelementaudiosourcenode-interface/mediaElementAudioSource_volumeChange.html`
  (output ของ source node สะท้อน `volume` / `muted`)
- รายงาน `AudioContext` บน iOS ถูก suspend / `"interrupted"` ใน WebKit Bugzilla เช่น
  https://bugs.webkit.org/show_bug.cgi?id=261554 และ
  https://bugs.webkit.org/show_bug.cgi?id=283419
