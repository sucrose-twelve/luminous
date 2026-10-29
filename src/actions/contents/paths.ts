/**
 * Path checks shared by the content and season actions. No `"use server"`: these are helpers, not endpoints,
 * so they never become callable from the browser.
 */
import path from "node:path"

import {
  IMAGE_EXTENSIONS,
  isSafeMediaPath,
  pathType,
  VIDEO_EXTENSIONS
} from "@/libs/media"

/**
 * Checks a content's source directory: a full path to a folder that exists.
 *
 * @returns An error message, or `null` when the folder is fine
 */
export async function checkSourceDir(directory: string) {
  if (!path.isAbsolute(directory)) return "Must be a full path to a folder"

  const type = await pathType(directory)
  if (type === "directory") return null

  return type === null ? "Folder not found" : "Must be a folder"
}

/**
 * Checks that an art path is an existing image given by its full path: the same rule the art route applies
 * before serving it. Posters may sit in any folder.
 *
 * @returns An error message, or `null` when the path is fine
 */
export async function checkArtPath(filePath: string) {
  if (!isSafeMediaPath(filePath, null, IMAGE_EXTENSIONS)) {
    return `Must be a full path to a ${IMAGE_EXTENSIONS.join(" / ")} file`
  }

  return (await pathType(filePath)) === "file" ? null : "File not found"
}

/**
 * Checks one season source: a movie's is an `.mp4` file, any other kind's a folder of `01.mp4`, `02.mp4`, …
 * Any source but the primary one may be listed before its files exist (`tests/track.spec.ts` skips it).
 *
 * @param isPrimary - Whether this is the season's `primarySource`, which has to be on disk
 * @returns An error message prefixed with the source's language, or `null` when the source is fine
 */
export async function checkSourcePath(
  { language, pathname }: Content.SeasonSource,
  kind: Content.SeasonKind,
  isPrimary: boolean
) {
  const isMovie = kind === "movie"
  if (
    isMovie
      ? !isSafeMediaPath(pathname, null, VIDEO_EXTENSIONS)
      : !path.isAbsolute(pathname)
  ) {
    return `${language}: Must be a full path to ${isMovie ? `a ${VIDEO_EXTENSIONS.join(" / ")} file` : "a folder"}`
  }

  const type = await pathType(pathname)
  if (type === (isMovie ? "file" : "directory") || (type === null && !isPrimary))
    return null

  return `${language}: ${type === null ? "Not found" : `Must be a ${isMovie ? "file" : "folder"}`}`
}
