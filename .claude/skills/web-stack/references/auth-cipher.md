# Auth — Cipher Tokens (not JWT)

This project uses an **encrypted** token instead of a signed JWT. That's a deliberate choice: it's slower, but
the payload is confidential as well as tamper-proof. Don't add `jose`, `jsonwebtoken`, NextAuth, or
iron-session.

## How it works

```
sign-in ──► verifyPassword ──► payload "luminous.<role>.<accountId>.<expiresAtMs>"   (AuthToken)
                                   │
                                   ▼  Cipher.encrypt (AES-GCM, key = scrypt(secret, random salt))
                          hex( salt | iv | authTag | ciphertext )
                                   │
                                   ▼  Set-Cookie: __app_auth_token (httpOnly)  ← startSession()
request ──► cookie ──► resolveSession()
                         ├─ validateToken: decryptToken (Redis-cached) → parse payload → check expiry
                         └─ readAuthAccount (cached by tag) → suspended? inactive? → AuthAccount
```

| Part           | Where                                        | What it does                                                                     |
| -------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| Cipher         | `src/libs/cipher.ts`                         | `Cipher.encrypt(plain)` / `Cipher.decrypt(hex)`                                  |
| Passwords      | `src/libs/password.ts`                       | `hashPassword`, `verifyPassword`, `DUMMY_PASSWORD_HASH`                          |
| Token          | `src/actions/token.ts`                       | `generateToken`, `validateToken`, `startSession`, `tokenTag`                     |
| Session check  | `src/actions/auth/read.ts`                   | `readAuthAccount`, `resolveSession`, type `AuthAccount`                          |
| Guards         | `src/actions/auth/index.ts`                  | `withAuth(action)` for actions, `withGuard(request)` for handlers                |
| Actions        | `src/actions/auth/sign-in.ts`, `sign-out.ts` | `signIn`, `signOut`                                                              |
| Validator      | `src/actions/auth/validator.zod.ts`          | `formValidator` (sign-in)                                                        |
| Create account | `tests/account.spec.ts`                      | CLI script, see [Accounts](#accounts-no-sign-up)                                 |
| Constants      | `@/constants`                                | `APP_TOKEN` (`__app_auth_token`), `ROLES`, `TOKEN.PREFIX`, `TOKEN.LIFETIME_DAYS` |
| Config         | `CIPHER` in `@/constants/env`                | `CIPHER_ALGO`, `CIPHER_SECRET`, `CIPHER_IV`, `CIPHER_SALT`                       |

### `AuthAccount`

`readAuthAccount(id)` (and so `withAuth`'s `account` and `withGuard`'s return value) has this shape:

```ts
{
  ...omit(accountColumns, ["password"]),          // id, role, username, email, isActive, isSuspended, …
  profile: omit(profileColumns, ["accountId"]),    // | null — left join
  preference: omit(preferenceColumns, ["accountId"]) // | null — left join
}
```

`profile` and `preference` are `null` if their row is missing, so handle `null`. Because profile and
preference are cached with the account, editing either must `updateTag(\`auth-account/${accountId}\`)`.

`token.ts` and `auth/read.ts` have **no `"use server"`**. They're server helpers, not endpoints. Never add the
directive to them: `readAuthAccount(id)` would become a public action that returns any account.

## Cipher rules (`src/libs/cipher.ts`)

- **AES-GCM only** (`aes-128-gcm`, `aes-192-gcm`, `aes-256-gcm`; default `aes-256-gcm`). The GCM auth tag
  makes any modified token fail `decipher.final()`. Never switch to CBC/CTR (no integrity).
- The key length follows the algorithm through the `KEY_LENGTH` map (16 / 24 / 32 bytes). It's derived with
  **async** `scrypt(secret, salt, keyLength)` so key derivation doesn't block the event loop. About 25 ms per
  call is the "slower" part.
- A fresh random **salt** (`CIPHER_SALT`, 16–64, default 16) and **IV** (`CIPHER_IV`, 12–16, default 12) per
  encryption. The auth tag is 16 bytes. The wire format is `hex(salt | iv | tag | ciphertext)`, and the
  slicing in `decrypt` must stay in sync with `encrypt`.
- `decrypt` rejects non-hex input and input shorter than the header before touching crypto. Any throw means
  **invalid token**: catch it, treat it as unauthenticated, and never echo crypto errors to the client.
- `CIPHER_SECRET` is required, at least 32 characters, with no default: the env schema refuses to start
  without it. Generate it with
  `bun -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. It lives only in `.env`.
  Changing it signs everyone out.

## Token (`src/actions/token.ts`)

- Payload: `"luminous.<role>.<accountId>.<expiresAtMs>"`, typed by the global `AuthToken`
  (`src/types/app.d.ts`). Fields are `.`-separated because UUIDs contain `-`. `validateToken` checks it with a
  Zod tuple: prefix literal, role in `Account.Role`, UUID, positive integer.
- `role` in the token is a hint from sign-in time. **Authorize with `account.role` from `resolveSession`**,
  which comes from the DB.
- Lifetime (`TOKEN_LIFETIME_DAYS`): `keepLoggedIn` gets 365 days and a persistent cookie (`maxAge`). Otherwise
  it's 1 day in a browser-session cookie (no `maxAge`).
- `validateToken` throws `Error("401 Invalid token" | "401 Token expired")`. The messages follow the
  `"<status> <message>"` convention so they can go straight to `ErrorBoundary`.
- `import { type Account } from "@/drizzle/types"` **shadows** the global `Account` namespace
  (`Account.Role`). In files that need `Account.Role`, don't import the drizzle `Account` type; use a local
  shape (`type TokenAccount = { id: string; role: Account.Role }`).

### Caching: only the pure part

```ts
async function decryptToken(token: string) {
  "use cache: remote"
  cacheTag(tokenTag(token))
  cacheLife("hours")

  return Cipher.decrypt(token)
}
```

- Only decryption is cached (Redis). The **expiry check runs outside** the cache in `validateToken`, because
  it compares against now. A cached "valid" verdict would outlive the token.
- `tokenTag(token)` = `auth-token/${uuidV5(token, NIL)}`: hashed, so tags stay short and don't contain the
  token.
- Failures throw and aren't cached, so junk tokens aren't memoized.
- `readAuthAccount(id)` is cached with `"use cache"` +
  `cacheTag(\`auth-account/${id}\`)`. **Anything that changes an account** (suspend, deactivate, role change, delete) must `updateTag(\`auth-account/${id}\`)`, or `withAuth`keeps accepting the old state for up to the`cacheLife`.

## Cookie (`startSession`)

```ts
cookieStore.set(APP_TOKEN, token, {
  httpOnly: true,
  sameSite: "lax",
  secure: ENV.APP_URL.startsWith("https://"),
  path: "/",
  maxAge: keepLoggedIn ? days * 24 * 60 * 60 : undefined
})
```

- `httpOnly` always: client JS never reads the token.
- `sameSite: "lax"` plus the Server Actions' built-in Origin check covers CSRF for this app.
- `secure` follows `NEXT_PUBLIC_APP_URL`. Both dev (`https://localhost:8443`) and prod (HTTPS on the LAN) are
  HTTPS, so keep `APP_URL` an `https://` URL and the cookie is always `Secure`. Never serve prod over plain
  HTTP: anyone on the Wi-Fi could read the token. See [lan-https.md](lan-https.md).
- The cookie is per device and per host. Each device signs in once and stays signed in for 365 days. Several
  devices can use the same account at the same time.
- Call `startSession` only from Server Actions; setting cookies anywhere else throws.

## Passwords — hash, never encrypt (`src/libs/password.ts`)

- `hashPassword(password)` returns `"<saltHex>:<hashHex>"`: scrypt with a 16-byte random salt and a 64-byte
  key, input normalized with `NFKC`. This is stored in `accounts.password`.
- `verifyPassword(password, stored)` re-hashes and compares with `crypto.timingSafeEqual`.
- When no account matches the username/email, verify against `DUMMY_PASSWORD_HASH` anyway, so both failures
  take the same time and return the same message.
- `accounts.password` never leaves the auth module. Every other read uses
  `omit(accountColumns, ["password"])`.

## Guarding code

| Where                            | Use                                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Server Actions, server readers   | `withAuth(async (account, ...args) => …)`. `account` is `AuthAccount` (no password)                              |
| Route Handlers (`/api/stream/…`) | `const account = await withGuard(request)` → `401` if `null`                                                     |
| `(protected)` layout / pages     | `resolveSession(cookie)` → when `!ok`, render the page with the sign-in modal open (there is no `/sign-in` page) |
| `proxy.ts` (optional)            | Only "no cookie → redirect". Never decrypt or hit the DB there                                                   |

- All three server paths go through `resolveSession`, so the checks are identical: valid token, account
  exists, not `isSuspended` (→ `423 … permanently suspended`), `isActive` (→ `423 … temporarily suspended`).
- A layout check alone protects nothing: Server Actions and Route Handlers are reachable directly and must
  guard themselves.
- Always check ownership: a user may only read/write their own `watch_histories`, `watchlists`, and
  `preferences`. Use `account.id`, never an ID from the client.

## Sign-in (modal) / sign-out

**There is no `/sign-in` page.** Sign-in is a **modal** that can open over any page: from a "Sign in" button,
or when a protected page or action needs a session. The modal UI isn't built yet. When you build it, it calls
`signIn` and doesn't navigate.

**`signIn(input: unknown)`**:

1. `formValidator`: `identifier` (username **or** email), `password` (8–32), `keepLoggedIn?`. Expected
   failures are **returned**: `{ ok: false, errors }` (field errors) or `{ ok: false, message }`.
2. If `identifier` contains `@`, match `accounts.email` (lowercased); otherwise match `accounts.username`.
   Select `pick(accountColumns, ["id", "role", "password", "isActive", "isSuspended"])`.
3. `verifyPassword` (with the dummy hash if no account matched). Return the same "Invalid username, email, or
   password" for both failures.
4. Reject suspended or inactive accounts.
5. `startSession(account, keepLoggedIn)` → return **`{ ok: true }`**. There's no redirect: setting a cookie in
   a Server Action re-renders the current route, so the modal closes and the page shows the signed-in state.

**`signOut()`**: `updateTag(tokenTag(token))` → delete the cookie → `redirect("/")`.

## Accounts (no sign-up)

The app is private (one household), so **there is no sign-up action or UI**. Create accounts from the
terminal:

```bash
bun tests/account.spec.ts --email user@luminous.co --password p4ssw02d
bun tests/account.spec.ts --email admin@luminous.co --password p4ssw02d --role admin --username admin
```

- `--username` defaults to the slugified part of the email before `@`. `--role` (`ROLES`) defaults to `user`.
- The script refuses a username or email that already exists. In one transaction it inserts `accounts`
  (`hashPassword`, lowercased email), `profiles` (`displayName` = username), and `preferences`.
- `accounts.username` and `accounts.email` are each unique. Store emails lowercased (the sign-in lookup
  lowercases too).

### Test accounts

To test auth or anything else that needs a signed-in user, use these accounts. Don't create new ones.

| Role  | Email               | Password   |
| ----- | ------------------- | ---------- |
| admin | `admin@luminous.co` | `p4ssw02d` |
| user  | `user@luminous.co`  | `p4ssw02d` |

## Known limitation: no server-side revocation

Tokens are stateless. Sign-out deletes the cookie in that browser, but a copied token stays valid until it
expires (at most 365 days). Suspending an account works immediately, as long as `auth-account/${id}` is
invalidated. If real revocation is needed later, add a `sessions` table (`id`, `account_id`, `expires_at`,
`revoked_at`, `user_agent`, `ip`). Put the session ID in the payload instead of the account ID, have
`resolveSession` check `revoked_at` (cached by `auth-session/${id}`), and have sign-out set it.

Optional hardening: rate-limit `signIn` per IP + identifier in Redis.
