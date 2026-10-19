import fs from "fs"
import path from "path"

import { VIDEO_EXTENSIONS } from "./constants"
import { type ArgsValidator } from "./validator.zod"

/**
 * Lists the videos directly inside `directory`, sorted by name. Sub-folders are never read, so the default
 * output folder (`<dir>/upscaled/`) isn't picked up on the next run.
 */
export async function findVideos(directory: string) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true })

  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        VIDEO_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())
    )
    .map((entry) => path.join(directory, entry.name))
    .sort((a, b) => a.localeCompare(b))
}

/**
 * Where a video's result goes: `<out>/<name>_1080p_60fps.mp4`.
 */
export function outputPath(
  input: string,
  directory: string,
  { scale, frame }: Pick<ArgsValidator, "scale" | "frame">
) {
  return path.join(directory, `${path.parse(input).name}_${scale}p_${frame}fps.mp4`)
}
