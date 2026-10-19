import fs from "fs"
import path from "path"

export type Box = { type: string; start: number; end: number }

/**
 * Resolves a path and normalizes it to forward slashes, the form every path column is stored in.
 */
export function toStoredPath(filePath: string) {
  return path.resolve(filePath).replaceAll("\\", "/")
}

/**
 * Pads an episode number like the video files: `1` → `01`.
 */
export function fileStem(episodeNo: number) {
  return String(episodeNo).padStart(2, "0")
}

/**
 * The message of anything thrown, for a log line.
 */
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Reads `count` bytes at `position` from an open file.
 */
export async function readAt(file: fs.promises.FileHandle, position: number, count: number) {
  const buffer = Buffer.alloc(count)
  const { bytesRead } = await file.read(buffer, 0, count, position)
  return buffer.subarray(0, bytesRead)
}

/**
 * Reads the MP4 box header at `offset`, handling 64-bit sizes (`size == 1`) and "to end of file" (`size == 0`).
 */
export function readBoxHeader(buffer: Buffer, offset: number, limit: number): Box | null {
  if (offset + 8 > limit) return null

  const size = buffer.readUInt32BE(offset)
  const type = buffer.toString("latin1", offset + 4, offset + 8)

  if (size === 1) {
    if (offset + 16 > limit) return null
    return { type, start: offset, end: offset + Number(buffer.readBigUInt64BE(offset + 8)) }
  }

  return { type, start: offset, end: size === 0 ? limit : offset + size }
}

/**
 * Header length of a box: 16 bytes for a 64-bit size, otherwise 8.
 */
export function headerLength(buffer: Buffer, box: Box) {
  return buffer.readUInt32BE(box.start) === 1 ? 16 : 8
}

/**
 * Lists the child boxes inside `start … end` of an in-memory buffer.
 */
export function childBoxes(buffer: Buffer, start: number, end: number) {
  const boxes: Box[] = []
  let offset = start

  while (offset < end) {
    const box = readBoxHeader(buffer, offset, end)
    if (!box || box.end <= offset) break

    boxes.push(box)
    offset = box.end
  }

  return boxes
}

/**
 * Finds the first box at a path of nested types, e.g. `["mdia", "minf", "stbl", "stsd"]`.
 */
export function findBox(buffer: Buffer, parent: Box, types: string[]): Box | null {
  let current: Box | null = parent

  for (const type of types) {
    if (!current) return null
    current =
      childBoxes(buffer, current.start + headerLength(buffer, current), current.end).find(
        (box) => box.type === type
      ) ?? null
  }

  return current
}
