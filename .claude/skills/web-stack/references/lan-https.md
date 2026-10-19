# LAN & HTTPS

Luminous runs on one Windows machine. **Dev is localhost-only**; **prod is served over HTTPS to the home LAN** so
phones, laptops, and TVs in the house can use it.

| Mode | Command                                | Listens on       | TLS certificate                                |
| ---- | -------------------------------------- | ---------------- | ---------------------------------------------- |
| Dev  | `bun run start:dev`                    | `localhost:8443` | Next's `--experimental-https` (localhost only) |
| Prod | `bun run build` → `bun run start:prod` | `0.0.0.0:<port>` | `certificates/lan.pem` from mkcert             |

- `start:dev` passes `--hostname localhost` on purpose: `next dev` would otherwise listen on every interface.
  **Never expose dev to the LAN.**
- `start:prod` runs `next-prod.ts` (`NODE_ENV=production node next-prod.ts`), a custom HTTPS server.
  `next start` can't serve HTTPS. The port comes from `NEXT_PUBLIC_APP_URL` (default 8443). On startup it
  prints the localhost and LAN URLs.
- `next-prod.ts` loads `.env` itself (`@next/env`) before reading `NEXT_PUBLIC_APP_URL`, and exits with a hint
  if the certificate is missing.

## Certificate (mkcert)

```bash
bun tests/certificate.spec.ts
```

- Issues `certificates/lan.pem` + `lan-key.pem` for `localhost`, `127.0.0.1`, `::1`, the machine's hostname,
  and **every current LAN IPv4**. `*.pem` is git-ignored.
- Re-run it when the server's LAN IP changes. Avoid that by giving the server a **fixed IP** (DHCP reservation
  in the router).
- The certificate is signed by mkcert's local root CA (`mkcert -CAROOT` → `rootCA.pem`). The server machine
  trusts it already (`mkcert -install`). **Every other device must trust that root CA once.**

## Trusting the root CA on other devices

Copy **only `rootCA.pem`** to the device, by USB, a shared folder, or AirDrop. **Never copy
`rootCA-key.pem`**: anyone with it can issue certificates every device in the house would trust.

| Device               | Steps                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows              | Double-click `rootCA.pem` (rename to `.crt` if needed) → Install Certificate → Local Machine → "Trusted Root Certification Authorities"                       |
| macOS                | Open in Keychain Access → System keychain → open the cert → Trust → "Always Trust"                                                                            |
| iPhone / iPad        | Send the file (AirDrop / Files) → Settings → Profile Downloaded → Install → then Settings → General → About → Certificate Trust Settings → turn on full trust |
| Android              | Settings → Security → Encryption & credentials → Install a certificate → CA certificate                                                                       |
| Firefox (any OS)     | Uses its own store: Settings → Certificates → View → Authorities → Import (or enable `security.enterprise_roots.enabled` on Windows/macOS)                    |
| Smart TVs / consoles | Usually can't add a CA. Cast from a phone or laptop instead.                                                                                                  |

Then open `https://<server-ip>:8443`. There should be no certificate warning. If there is one, the CA isn't
trusted on that device, or the IP isn't in the certificate (re-run the script).

## Windows Firewall (server machine, once, admin PowerShell)

```powershell
New-NetFirewallRule -DisplayName "Luminous (HTTPS 8443)" -Direction Inbound -Protocol TCP -LocalPort 8443 -Action Allow -Profile Private
```

Allow it on the **Private** profile only, and make sure the home Wi-Fi is set to the Private network profile.

## Rules for code

- Assume requests come from **other devices**: never trust the client, keep auth checks server-side, and don't
  rely on `localhost` behaviour.
- `NEXT_PUBLIC_APP_URL` stays `https://…`, so cookies are `Secure` (see [auth-cipher.md](auth-cipher.md)).
- Don't hard-code `localhost` or an IP in links or API calls. Use relative URLs (`/api/stream/…`), so the same
  page works from every device.
- Server Actions check that `Origin` matches `Host`. Direct access by IP or hostname passes. If a reverse
  proxy or a different hostname is ever added, configure `experimental.serverActions.allowedOrigins`.
- Redis and Postgres stay bound to `127.0.0.1`. Only the Next server is exposed to the LAN.
