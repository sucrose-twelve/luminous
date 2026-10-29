import { asc, count, desc, eq, sql, type AnyColumn, type SQL } from "drizzle-orm"
import { pick } from "es-toolkit"

import { withRole } from "@/actions/auth"
import { STAFF_ROLES, type AccountSort } from "@/constants"
import { db, schema } from "@/drizzle"
import { accountColumns, profileColumns } from "@/drizzle/table-columns"
import { lastPageOf, toPagination, withPagination } from "@/drizzle/utils"

import type { QueryValidator } from "../validator.nuqs"

/**
 * Picked outside the `withRole` callback: inline, TypeScript infers `pick`'s keys from the callback's generic
 * return type and types the row as the whole table.
 */
const accountFields = {
  account: pick(accountColumns, [
    "id",
    "role",
    "username",
    "email",
    "isActive",
    "isVerified",
    "isSuspended",
    "suspendedAt",
    "createdAt"
  ]),
  profile: pick(profileColumns, ["displayName", "avatar"])
}

/**
 * The column each sort orders by. Roles sort by rank (root, admin, user), not alphabetically.
 */
const SORT_COLUMNS: Record<AccountSort, AnyColumn | SQL> = {
  username: schema.accounts.username,
  displayName: schema.profiles.displayName,
  role: sql`case ${schema.accounts.role} when 'root' then 0 when 'admin' then 1 else 2 end`,
  joined: schema.accounts.createdAt
}

/**
 * Lists every account for the control panel, sorted and paginated. Not cached: staff must see an account as
 * soon as it exists, and the panel has one or two readers. Never selects the password hash.
 *
 * @param query - The page's search params, already parsed by `queryValidator`
 * @returns One page of accounts with their profile (`null` when the row is missing). A page past the end is
 * clamped to the last page.
 */
export const readControlAccounts = withRole(
  STAFF_ROLES,
  async (_account, { page, take, sort, order }: QueryValidator) => {
    const direction = order === "asc" ? asc : desc

    const readPage = (pageNo: number) =>
      withPagination(
        db
          .select(accountFields)
          .from(schema.accounts)
          .leftJoin(schema.profiles, eq(schema.profiles.accountId, schema.accounts.id))
          .orderBy(direction(SORT_COLUMNS[sort]), asc(schema.accounts.id))
          .$dynamic(),
        pageNo,
        take
      )

    /**
     * Count and rows run together; only a jump past the last page pays for a second read.
     */
    const [[{ total }], rows] = await Promise.all([
      db.select({ total: count() }).from(schema.accounts),
      readPage(page)
    ])

    const currentPage = Math.min(page, lastPageOf(total, take))
    const pageRows = currentPage === page ? rows : await readPage(currentPage)

    return toPagination(pageRows, total, currentPage, take)
  }
)

export type ControlAccountRow = Awaited<
  ReturnType<typeof readControlAccounts>
>["data"][number]

/**
 * Counts accounts per role, with how many of them are suspended or inactive, for the panel's summary.
 *
 * @returns One row per role that has accounts
 */
export const readAccountSummary = withRole(STAFF_ROLES, async () => {
  return db
    .select({
      role: schema.accounts.role,
      total: count(),
      suspended: sql<number>`(count(*) filter (where ${schema.accounts.isSuspended}))::int`,
      inactive: sql<number>`(count(*) filter (where not ${schema.accounts.isActive}))::int`
    })
    .from(schema.accounts)
    .groupBy(schema.accounts.role)
})
