import fs from "node:fs"
import path from "node:path"
import { setTimeout } from "node:timers/promises"

import { spawn } from "bun"

import { logger } from "@/libs/logger"

async function main() {
  const startedAt = new Date()

  const directories: string[] = []
  for await (const dir of directories) {
    const files = await fs.promises.readdir(path.resolve(dir), { withFileTypes: true })
    logger(dir)

    for await (const file of files) {
      if (file.isFile() && file.name.toLowerCase().endsWith("mp4")) {
        const n = new Date()
        const pathname = path.join(file.parentPath, file.name)
        const args = [
          "-i",
          pathname,
          "-map",
          "0:v:0",
          "-map",
          "0:a",
          "-map_chapters",
          "-1",
          "-c:v",
          "libx264",
          "-preset",
          "slow",
          "-crf",
          "18",
          "-pix_fmt",
          "yuv420p",
          "-profile:v",
          "high",
          "-g",
          "48",
          "-c:a",
          "copy",
          pathname.split(".")[0] + ".x264.mp4"
        ]

        logger(`📄 "${file.name}" re-encoding...`, n)
        const process = spawn(["ffmpeg", ...args], {
          stdout: "ignore",
          stderr: "inherit",
          maxBuffer: 1024 * 1024 * 64
        })

        await process.exited
        logger(`✅ "${file.name}" re-encoded`, n)

        await setTimeout(200)
      }
    }
  }

  logger("🎉 Re-encoding finished!", startedAt)
  process.exit(0)
}

main()
