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
