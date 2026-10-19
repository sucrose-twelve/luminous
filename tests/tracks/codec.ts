import { PLAIN_CODECS } from "./constants"
import { childBoxes, headerLength, type Box } from "./utils"

/**
 * Reads an MPEG-4 descriptor header inside `esds`: a tag byte, then a size of up to four 7-bit bytes.
 */
function readDescriptor(buffer: Buffer, offset: number) {
  const tag = buffer[offset]
  let size = 0
  let cursor = offset + 1

  for (let i = 0; i < 4; i++) {
    const byte = buffer[cursor++]
    size = (size << 7) | (byte & 0x7f)
    if (!(byte & 0x80)) break
  }

  return { tag, size, body: cursor }
}

/**
 * Hex of one byte, zero-padded to two digits.
 */
function hexByte(byte: number) {
  return byte.toString(16).padStart(2, "0")
}

/**
 * Finds a sample entry's config box. Visual entries have 78 bytes of fields before their child boxes, audio
 * entries 28.
 */
function findConfig(buffer: Buffer, entry: Box, fieldsLength: number, type: string) {
  const entryBody = entry.start + headerLength(buffer, entry)
  const box = childBoxes(buffer, entryBody + fieldsLength, entry.end).find((child) => child.type === type)
  return box ? box.start + headerLength(buffer, box) : null
}

/**
 * `avc1.PPCCLL`: profile, constraint flags, and level from `avcC`.
 */
function readAvcCodec(buffer: Buffer, entry: Box) {
  const config = findConfig(buffer, entry, 78, "avcC")
  if (config === null) return null

  return `${entry.type}.${[1, 2, 3].map((index) => hexByte(buffer[config + index])).join("")}`
}

/**
 * `hvc1.<space><profile>.<compat>.<tier><level>.<constraints>` from `hvcC` (ISO/IEC 14496-15 Annex E), e.g.
 * `hvc1.1.6.L93.B0`.
 */
function readHevcCodec(buffer: Buffer, entry: Box) {
  const config = findConfig(buffer, entry, 78, "hvcC")
  if (config === null) return null

  const profileByte = buffer[config + 1]
  const profileSpace = ["", "A", "B", "C"][profileByte >> 6]
  const tier = profileByte & 0x20 ? "H" : "L"
  const profile = profileByte & 0x1f

  /**
   * The compatibility flags are written bit-reversed, in hex without leading zeros.
   */
  const flags = buffer.readUInt32BE(config + 2)
  let reversed = 0
  for (let bit = 0; bit < 32; bit++) reversed = (reversed << 1) | ((flags >>> bit) & 1)
  const compatibility = (reversed >>> 0).toString(16)

  /**
   * Six constraint bytes, each in hex, with trailing zero bytes dropped.
   */
  const constraints = [...buffer.subarray(config + 6, config + 12)]
  while (constraints.length > 0 && constraints[constraints.length - 1] === 0) constraints.pop()

  const level = buffer[config + 12]
  return [
    entry.type,
    `${profileSpace}${profile}`,
    compatibility,
    `${tier}${level}`,
    ...constraints.map((byte) => byte.toString(16).toUpperCase())
  ].join(".")
}

/**
 * `av01.P.LLT.DD`: profile, level, tier, and bit depth from `av1C`, e.g. `av01.0.08M.08`.
 */
function readAv1Codec(buffer: Buffer, entry: Box) {
  const config = findConfig(buffer, entry, 78, "av1C")
  if (config === null) return null

  const profile = buffer[config + 1] >> 5
  const level = buffer[config + 1] & 0x1f
  const tier = buffer[config + 2] & 0x80 ? "H" : "M"
  const bitDepth = buffer[config + 2] & 0x40 ? (buffer[config + 2] & 0x20 ? 12 : 10) : 8

  return `av01.${profile}.${String(level).padStart(2, "0")}${tier}.${String(bitDepth).padStart(2, "0")}`
}

/**
 * `vp09.PP.LL.DD`: profile, level, and bit depth from `vpcC` (a full box), e.g. `vp09.00.10.08`.
 */
function readVp9Codec(buffer: Buffer, entry: Box) {
  const config = findConfig(buffer, entry, 78, "vpcC")
  if (config === null) return null

  const fields = [buffer[config + 4], buffer[config + 5], buffer[config + 6] >> 4]
  return `vp09.${fields.map((value) => String(value).padStart(2, "0")).join(".")}`
}

/**
 * `mp4a.OO.A`: object type from the `esds` decoder config and the AAC audio object type, e.g. `mp4a.40.2`.
 */
function readMp4aCodec(buffer: Buffer, entry: Box) {
  const esds = findConfig(buffer, entry, 28, "esds")
  if (esds === null) return null

  const es = readDescriptor(buffer, esds + 4)
  if (es.tag !== 0x03) return null

  const flags = buffer[es.body + 2]
  let cursor = es.body + 3
  if (flags & 0x80) cursor += 2
  if (flags & 0x40) cursor += 1 + buffer[cursor]
  if (flags & 0x20) cursor += 2

  const decoderConfig = readDescriptor(buffer, cursor)
  if (decoderConfig.tag !== 0x04) return null

  const objectType = buffer[decoderConfig.body]
  const specificInfo = readDescriptor(buffer, decoderConfig.body + 13)
  if (specificInfo.tag !== 0x05) return `mp4a.${objectType.toString(16)}`

  /**
   * Audio object type 31 means the real type is stored in the next 6 bits, plus 32.
   */
  let audioObjectType = buffer[specificInfo.body] >> 3
  if (audioObjectType === 31) {
    audioObjectType = 32 + (((buffer[specificInfo.body] & 0x07) << 3) | (buffer[specificInfo.body + 1] >> 5))
  }

  return `mp4a.${objectType.toString(16)}.${audioObjectType}`
}

/**
 * Builds the RFC 6381 codec string MSE needs (`avc1.640028`, `hvc1.1.6.L93.B0`, `mp4a.40.2`) from a track's
 * `stsd` sample entry. ffprobe doesn't print this form, so it is read from the config boxes directly.
 *
 * @returns The codec string, or `null` for a codec it can't describe
 */
export function readCodec(buffer: Buffer, entry: Box) {
  switch (entry.type) {
    case "avc1":
    case "avc3":
      return readAvcCodec(buffer, entry)
    case "hvc1":
    case "hev1":
      return readHevcCodec(buffer, entry)
    case "av01":
      return readAv1Codec(buffer, entry)
    case "vp09":
      return readVp9Codec(buffer, entry)
    case "mp4a":
      return readMp4aCodec(buffer, entry)
    default:
      return PLAIN_CODECS[entry.type] ?? null
  }
}
