/**
 * Production server: HTTPS on every interface, so other devices on the LAN can use the app.
 *
 * `next start` can't serve HTTPS, hence this custom server. Run it with `bun run start:prod` after
 * `bun run build`. The certificate comes from `bun tests/certificate.spec.ts` (mkcert).
 */
import fs from "fs"
import { createServer } from "https"
import os from "os"
import path from "path"

import nextEnv from "@next/env"
import next from "next"

const dir = process.cwd()
nextEnv.loadEnvConfig(dir, false)

const url = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:8443")
const port = Number(url.port) || 443
const hostname = "0.0.0.0"

const certDir = path.join(dir, "certificates")
const keyFile = path.join(certDir, "lan-key.pem")
const certFile = path.join(certDir, "lan.pem")

if (!fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
  console.error("\x1b[31m✗\x1b[0m Missing certificates/lan.pem. Run: bun tests/certificate.spec.ts")
  process.exit(1)
}

const app = next({ dev: false, dir, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer({ key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }, (req, res) => {
    handle(req, res)
  })
    .listen(port, hostname)
    .on("listening", () => {
      const lanAddresses = Object.values(os.networkInterfaces())
        .flat()
        .filter((net) => net?.family === "IPv4" && !net.internal)
        .map((net) => `https://${net!.address}:${port}`)

      console.info("\x1b[32m✓\x1b[0m Server running at:")
      for (const address of [`https://localhost:${port}`, ...lanAddresses]) {
        console.info(`  \x1b[32m${address}\x1b[0m`)
      }
    })
})
