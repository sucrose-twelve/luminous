# Control: Accounts — `/ctrl/accounts` (read-only)

> ส่วนหนึ่งของ [Control Panel spec](../control-spec.md) (อ้างถึงเป็น `main §N`) · v1 ดูได้
> อย่างเดียว การแก้ไขอยู่ใน §3 (phase 2)

## 1. หน้า

- **Title** `Accounts` · **Description** "Everyone who can sign in. There is no sign-up:
  accounts are created from the terminal."
- `root` และ `admin` เห็นทุก account รวม root (ดูอย่างเดียว)
- reader `readControlAccounts(query)`: `accounts` left join `profiles` ·
  `omit(accountColumns, ["password"])` · ห่อ `withRole(STAFF_ROLES, …)`
- **`-R` panel** (ร่างแรกไม่ได้กำหนด) เสนอ:
  - สรุปจำนวนตาม role และสถานะ (Root 1 · Admin 1 · User 3 · Suspended 0)
  - **Add an account**: คำสั่ง
    `bun tests/account.spec.ts --email … --password … [--role admin] [--username …]` +
    ปุ่ม copy (เพราะยังไม่มี sign-up และยังสร้างจากหน้านี้ไม่ได้)
- ไม่มี filter (account ในบ้านมีไม่กี่คน) แต่ใช้ sort + pager ตาม main §5 (A1)

## 2. ตาราง

| Column       | ค่า                                                                                          | Sort               |
| ------------ | -------------------------------------------------------------------------------------------- | ------------------ |
| Account      | avatar (`profiles.avatar` แสดงแบบ `account-menu.tsx`) + `username` + `email` บรรทัดรอง muted | ✓ username         |
| Display name | `profiles.displayName` (ไม่มี profile → `—`)                                                 | ✓                  |
| Role         | chip §2.1                                                                                    | ✓                  |
| Status       | chips §2.1: Active / Inactive · Verified · Suspended                                         | —                  |
| Joined       | `createdAt` (tooltip เวลาเต็ม)                                                               | ✓ ค่าเริ่มต้น desc |

- **เพิ่ม `isSuspended`**: มีใน schema และ `resolveSession` ใช้บล็อก sign-in
  (`423 … permanently suspended`) แต่ร่างแรกไม่ได้แสดง · ถ้ามี `suspendedAt` แสดงใน
  tooltip ของ chip
- account ของคนที่ดูอยู่มี label `You` ต่อท้าย username

### 2.1 สี chip (โทนมืด: main §5.6)

| Chip      | เงื่อนไข                  | ร่างแรก                         | เสนอ (dark-only)                                                |
| --------- | ------------------------- | ------------------------------- | --------------------------------------------------------------- |
| Root      | `role = root`             | `bg-red-100 text-red-900`       | `bg-red-500/15 text-red-300`                                    |
| Admin     | `role = admin`            | `bg-amber-100 text-amber-900`   | `bg-amber-500/15 text-amber-300`                                |
| User      | `role = user`             | `bg-teal-100 text-teal-900`     | `bg-teal-500/15 text-teal-300`                                  |
| Active    | `isActive`                | `bg-blue-100 text-blue-900`     | `bg-blue-500/15 text-blue-300`                                  |
| Inactive  | `!isActive` (**เพิ่ม**)   | —                               | `bg-zinc-500/15 text-zinc-400`                                  |
| Verified  | `isVerified`              | `bg-indigo-100 text-indigo-900` | `bg-indigo-500/15 text-indigo-300`                              |
| Suspended | `isSuspended` (**เพิ่ม**) | —                               | `bg-destructive text-white` (ทึบ ให้ต่างจาก Root ที่เป็นแดงจาง) |

- unverified ไม่แสดง chip (A2) · map สีอยู่ใน `utils.ts` ของ route นี้
- ป้าย role ใน header (main §4.1) ใช้สีเดียวกัน

## 3. Phase 2: จัดการ accounts (ยังไม่ทำ)

เสนอให้ทำได้เฉพาะ `root` (main Q3):

- **สร้าง account** แทน `tests/account.spec.ts`: ย้าย logic (insert `accounts` +
  `profiles` + `preferences` ใน transaction เดียว, `hashPassword`, email ตัวเล็ก) ไป
  `@/actions/auth/create.ts` แล้วให้ script เรียกตัวเดียวกัน
- **เปลี่ยน role**, **Deactivate** (`isActive = false` → `423 … temporarily suspended`),
  **Suspend** (`isSuspended` + `suspendedAt`), **Reset password**
- ทุกการแก้ต้อง ``updateTag(`auth-account/${id}`)`` ไม่งั้น `withAuth`
  ยังรับสถานะเก่าจนหมด `cacheLife` (`auth-cipher.md`)
- กันพลาด: แก้ role / suspend ตัวเองไม่ได้ · ลด role หรือ suspend root คนสุดท้ายไม่ได้
- token เป็น stateless: suspend มีผลทันทีผ่าน tag ข้างบน · เปลี่ยน role มีผล request ถัดไป
  (role อ่านจาก DB) · reset password **ไม่**ทำให้ token เดิมหมดอายุ (ข้อจำกัดเดิมของระบบ
  จนกว่า จะมีตาราง `sessions`)

## 4. การตัดสินใจ

| #   | เรื่อง                      | คำตอบ                            |
| --- | --------------------------- | -------------------------------- |
| A1  | filter role / status        | ไม่มี                            |
| A2  | `isVerified`                | แสดงเฉพาะ Verified เมื่อ true    |
| A3  | admin เห็น account ของ root | เห็นทั้งหมด (หน้านี้ยังไม่สำคัญ) |
