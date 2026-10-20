import { timestamp, type PgSelect } from "drizzle-orm/pg-core"

export const sharedTimestampColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date())
}

export function withPagination<T extends PgSelect>(
  queryBuilder: T,
  page: number = 1,
  pageSize: number = 10
) {
  return queryBuilder.limit(pageSize).offset((page - 1) * pageSize)
}

/**
 * Number of the last page; at least 1, so an empty result still has one page.
 */
export function lastPageOf(count: number, take: number) {
  return Math.max(1, Math.ceil(count / take))
}

/**
 * Wraps one page of rows with the numbers the pager needs.
 *
 * @param data - Rows of the current page
 * @param count - Total rows across all pages
 * @param currentPage - Page the rows belong to (already clamped to `1 … lastPage`)
 * @param take - Page size
 */
export function toPagination<T>(
  data: T[],
  count: number,
  currentPage: number,
  take: number
): Pagination<T> {
  const lastPage = lastPageOf(count, take)

  return {
    data,
    count,
    take,
    currentPage,
    nextPage: currentPage < lastPage ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
    lastPage
  }
}
