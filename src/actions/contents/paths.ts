/**
 * Path checks shared by the content and season actions. No `"use server"`: these are helpers, not endpoints,
 * so they never become callable from the browser.
 */
import fs from "node:fs"
import path from "node:path"

import { logger } from "@/libs/logger"
import {
  IMAGE_EXTENSIONS,
  isSafeMediaPath,
  pathType,
  VIDEO_EXTENSIONS
} from "@/libs/media"

/**
 * Checks a content's source directory: a full path that isn't a file. A folder that isn't on disk yet is fine:
 * the action creates it (`createFolder`) once every other check passes.
 *
 * @returns An error message, or `null` when the path is fine
 */
export async function checkSourceDir(directory: string) {
  if (!path.isAbsolute(directory)) return "Must be a full path to a folder"

  return (await pathType(directory)) === "file" ? "Must be a folder" : null
}

/**
 * Checks that an art path is an image given by its full path: the same rule the art route applies before
 * serving it. Only the path is checked, not the disk, so a poster can be set before its file is copied there
 * (the art route answers 404 until then). Posters may sit in any folder.
 *
 * @returns An error message, or `null` when the path is fine
 */
export function checkArtPath(filePath: string) {
  return isSafeMediaPath(filePath, null, IMAGE_EXTENSIONS)
    ? null
    : `Must be a full path to a ${IMAGE_EXTENSIONS.join(" / ")} file`
}

/**
 * Checks one season source: a movie's is an `.mp4` file, any other kind's a folder of `01.mp4`, `02.mp4`, …
 * Nothing has to be on disk yet: the action creates the missing folder (`createSourceFolder`), and
 * `tests/track.spec.ts` imports the files once they're there. A path that exists has to be the right type.
 *
 * @returns An error message prefixed with the source's language, or `null` when the source is fine
 */
export async function checkSourcePath(
  { language, pathname }: Content.SeasonSource,
  kind: Content.SeasonKind
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
  if (type === null || type === (isMovie ? "file" : "directory")) return null

  return `${language}: Must be a ${isMovie ? "file" : "folder"}`
}

/**
 * Creates a folder and its parents when they aren't on disk yet; an existing folder is left as is. Call it
 * after every other check, so a rejected form leaves no empty folder behind.
 *
 * @returns An error message, or `null` once the folder exists
 */
export async function createFolder(folder: string) {
  try {
    await fs.promises.mkdir(folder, { recursive: true })
    return null
  } catch (error) {
    logger(`⛔ Couldn't create ${folder}: ${String(error)}`)
    const code = (error as NodeJS.ErrnoException).code
    return `The folder couldn't be created${code ? ` (${code})` : ""}`
  }
}

/**
 * Creates the folder a season source needs (`createFolder`): a series source's own folder, or the folder a
 * movie's `.mp4` goes in.
 *
 * @returns An error message prefixed with the source's language, or `null` once the folder exists
 */
export async function createSourceFolder(
  { language, pathname }: Content.SeasonSource,
  kind: Content.SeasonKind
) {
  const error = await createFolder(kind === "movie" ? path.dirname(pathname) : pathname)
  return error ? `${language}: ${error}` : null
}
