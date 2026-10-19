import { execFileSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"

import { logger } from "@/libs/logger"

/**
 * Issues the HTTPS certificate for the production server with mkcert, valid for localhost, this machine's
 * hostname, and every LAN IPv4 address it currently has.
 *
 * Usage (from the repo root):
 * ```bash
 * bun tests/certificate.spec.ts
 * ```
 *
 * Re-run it whenever the machine's LAN IP changes (give the server a fixed IP in the router to avoid that).
 * Other devices must trust mkcert's root CA once; see the printed path.
 */
function main() {
  const certDir = path.resolve("certificates")
  fs.mkdirSync(certDir, { recursive: true })

  const lanAddresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((net) => net?.family === "IPv4" && !net.internal)
    .map((net) => net!.address)

  const names = ["localhost", "127.0.0.1", "::1", os.hostname(), ...lanAddresses]

  try {
    execFileSync(
      "mkcert",
      ["-key-file", path.join(certDir, "lan-key.pem"), "-cert-file", path.join(certDir, "lan.pem"), ...names],
      { stdio: "inherit" }
    )
  } catch {
    logger("❌ mkcert failed. Install it (choco install mkcert) and run `mkcert -install` once.")
    return
  }

  const caRoot = execFileSync("mkcert", ["-CAROOT"], { encoding: "utf-8" }).trim()

  logger(`🎉 Certificate for: ${names.join(", ")}`)
  logger(`📄 Root CA to install on other devices: ${path.join(caRoot, "rootCA.pem")}`)
  logger("⚠️ Never copy rootCA-key.pem anywhere")
}

main()
