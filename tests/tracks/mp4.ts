import fs from "fs"

import { readCodec } from "./codec"
import { probe } from "./ffprobe"
import { childBoxes, findBox, headerLength, readAt, readBoxHeader, type Box } from "./utils"

type TrackInfo = { id: number; handler: string; timescale: number; sampleEntry: string; codec: string | null }

/**
 * Reads every `trak` in `moov`: its ID, handler (`vide` / `soun`), timescale, and codec string.
 */
function readTracks(buffer: Buffer, moov: Box) {
  return childBoxes(buffer, moov.start + headerLength(buffer, moov), moov.end)
    .filter((box) => box.type === "trak")
    .map((trak): TrackInfo | null => {
      const tkhd = findBox(buffer, trak, ["tkhd"])
      const mdhd = findBox(buffer, trak, ["mdia", "mdhd"])
      const hdlr = findBox(buffer, trak, ["mdia", "hdlr"])
      const stsd = findBox(buffer, trak, ["mdia", "minf", "stbl", "stsd"])
      if (!tkhd || !mdhd || !hdlr || !stsd) return null

      /**
       * `tkhd` v1 and `mdhd` v1 widen their times to 64 bits, which moves the fields after them.
       */
      const tkhdBody = tkhd.start + headerLength(buffer, tkhd)
      const id = buffer.readUInt32BE(tkhdBody + (buffer[tkhdBody] === 1 ? 20 : 12))

      const mdhdBody = mdhd.start + headerLength(buffer, mdhd)
      const timescale = buffer.readUInt32BE(mdhdBody + (buffer[mdhdBody] === 1 ? 20 : 12))

      const handler = buffer.toString("latin1", hdlr.start + headerLength(buffer, hdlr) + 8, hdlr.start + 20)

      /**
       * `stsd` is a full box (4 bytes version + flags) followed by a 4-byte entry count.
       */
      const entry = readBoxHeader(buffer, stsd.start + headerLength(buffer, stsd) + 8, stsd.end)
      if (!entry) return null

      return { id, handler, timescale, sampleEntry: entry.type, codec: readCodec(buffer, entry) }
    })
    .filter((track) => track !== null)
}

/**
 * Reads the decode time (in track timescale units) of one `traf` from its `tfdt`.
 */
function readTrafTime(buffer: Buffer, traf: Box) {
  const tfhd = findBox(buffer, traf, ["tfhd"])
  const tfdt = findBox(buffer, traf, ["tfdt"])
  if (!tfhd || !tfdt) return null

  const trackId = buffer.readUInt32BE(tfhd.start + headerLength(buffer, tfhd) + 4)
  const tfdtBody = tfdt.start + headerLength(buffer, tfdt)
  const decodeTime =
    buffer[tfdtBody] === 1 ? Number(buffer.readBigUInt64BE(tfdtBody + 4)) : buffer.readUInt32BE(tfdtBody + 4)

  return { trackId, decodeTime }
}

/**
 * Walks the top-level boxes of a fragmented MP4 without loading the file: only `moov` and each `moof` (small)
 * are read in full, `mdat` is skipped by its size.
 *
 * @returns The init segment end (first `moof` offset), the codec string, and every fragment with its byte
 * range (`end` inclusive, as in an HTTP `Range`) and start time in seconds. Fragment durations are filled in
 * by the caller once the total duration is known.
 */
async function readFragmentIndex(filePath: string, size: number) {
  const file = await fs.promises.open(filePath, "r")

  try {
    let tracks: TrackInfo[] = []
    let initEnd: number | null = null
    const fragments: Omit<Content.Fragment, "duration">[] = []
    let offset = 0

    while (offset < size) {
      const header = await readAt(file, offset, 16)
      const box = readBoxHeader(header, 0, header.length)
      if (!box || box.end <= 0) throw new Error(`Corrupt box at byte ${offset}`)

      const start = offset
      const end = Math.min(offset + box.end, size)

      if (box.type === "moov") {
        const moov = await readAt(file, start, end - start)
        tracks = readTracks(moov, { type: "moov", start: 0, end: moov.length })
      }

      if (box.type === "moof") {
        initEnd ??= start

        const moof = await readAt(file, start, end - start)
        const trafs = childBoxes(
          moof,
          headerLength(moof, { type: "moof", start: 0, end: moof.length }),
          moof.length
        )
          .filter((child) => child.type === "traf")
          .map((traf) => readTrafTime(moof, traf))
          .filter((traf) => traf !== null)

        /**
         * Time the fragment by its video track, since seeking lands on video keyframes. Fall back to any
         * track for audio-only fragments.
         */
        const videoTrack = tracks.find((track) => track.handler === "vide")
        const traf = trafs.find((item) => item.trackId === videoTrack?.id) ?? trafs[0]
        const timescale = tracks.find((track) => track.id === traf?.trackId)?.timescale
        if (!traf || !timescale) throw new Error(`moof at byte ${start} has no readable tfdt`)

        fragments.push({ start, end: end - 1, time: traf.decodeTime / timescale })
      }

      /**
       * A fragment is its `moof` plus the `mdat` after it. Trailing boxes such as `mfra` are left out.
       */
      if (box.type === "mdat" && fragments.length > 0) {
        fragments[fragments.length - 1].end = end - 1
      }

      offset = end
    }

    if (initEnd === null || fragments.length === 0) {
      throw new Error("Not a fragmented MP4 (no moof); re-run with --remux")
    }

    if (tracks.length === 0) throw new Error("No readable track in moov")

    const unsupported = tracks.filter((track) => track.codec === null)
    if (unsupported.length > 0) {
      throw new Error(`Unsupported codec: ${unsupported.map((track) => track.sampleEntry).join(", ")}`)
    }

    const codecs = tracks.map((track) => track.codec).join(", ")
    return { initEnd, mimeCodec: `video/mp4; codecs="${codecs}"`, fragments }
  } finally {
    await file.close()
  }
}

/**
 * Tells whether a file is a fragmented MP4 by walking its top-level box headers until the first `moof`.
 */
export async function isFragmented(filePath: string) {
  const file = await fs.promises.open(filePath, "r")

  try {
    const { size } = await file.stat()
    let offset = 0

    while (offset < size) {
      const header = await readAt(file, offset, 16)
      const box = readBoxHeader(header, 0, header.length)
      if (!box || box.end <= 0) return false
      if (box.type === "moof") return true

      offset += box.end
    }

    return false
  } finally {
    await file.close()
  }
}

/**
 * Reads everything a `tracks` row needs from one file.
 */
export async function readTrackFile(filePath: string) {
  const stats = await fs.promises.stat(filePath)
  const { duration, width, height } = probe(filePath)
  const index = await readFragmentIndex(filePath, stats.size)

  /**
   * A fragment lasts until the next one starts; the last one lasts until the end of the file.
   */
  const fragments: Content.Fragment[] = index.fragments.map((fragment, i) => {
    const next = index.fragments[i + 1]?.time ?? duration
    return { ...fragment, duration: Math.max(next - fragment.time, 0) }
  })

  return {
    mimeCodec: index.mimeCodec,
    size: stats.size,
    duration: Math.round(duration),
    width,
    height,
    initEnd: index.initEnd,
    fragments
  }
}
