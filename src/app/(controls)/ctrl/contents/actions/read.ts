import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  inArray,
  sql,
  type AnyColumn,
  type SQL
} from "drizzle-orm"
import { omit } from "es-toolkit"

import { withRole } from "@/actions/auth"
import { STAFF_ROLES, type ContentSort } from "@/constants"
import { db, schema } from "@/drizzle"
import { contentColumns } from "@/drizzle/table-columns"
import { lastPageOf, toPagination, withPagination } from "@/drizzle/utils"

import type { QueryValidator } from "../validator.nuqs"

const seasonCount = sql<number>`(select count(*)::int from ${schema.seasons} where ${schema.seasons.contentId} = ${schema.contents.id})`

/**
 * The content's latest season by release date, whatever its kind or status, whose poster stands for the
 * content in the table. `null` when it has no season yet.
 */
const posterSeasonId = sql<
  string | null
>`(select ${schema.seasons.id} from ${schema.seasons} where ${schema.seasons.contentId} = ${schema.contents.id} order by ${schema.seasons.releasedOn} desc, ${schema.seasons.createdAt} desc limit 1)`

/**
 * `updatedAt` is `null` until a content is first edited, so it falls back to `createdAt`. Mapped like the column,
 * since the driver hands raw SQL timestamps back as strings.
 */
const updatedAt =
  sql<Date>`coalesce(${schema.contents.updatedAt}, ${schema.contents.createdAt})`.mapWith(
    schema.contents.createdAt
  )

/**
 * Picked outside the `withRole` callback: inline, TypeScript infers `omit`'s keys from the callback's generic
 * return type and types the row as the whole table. The whole content is read (not only the columns shown), so
 * the row menu can open the edit form without another query.
 */
const contentFields = {
  ...omit(contentColumns, ["searchText", "createdAt", "updatedAt"]),
  seasons: seasonCount,
  posterSeasonId,
  updatedAt
}

const SORT_COLUMNS: Record<ContentSort, AnyColumn | SQL> = {
  title: schema.contents.title,
  kind: schema.contents.kind,
  source: schema.contents.source,
  seasons: seasonCount,
  updated: updatedAt
}

/**
 * Lists contents for the control panel, filtered by kind, source, and genres (every selected genre), sorted,
 * and paginated. Not cached: staff must see their own edits at once.
 *
 * Adult kinds are listed like any other: the site's `ADULT_KINDS` rule doesn't apply to staff.
 *
 * @param query - The page's search params, already parsed by `queryValidator`
 * @returns One page of contents with their season count; a page past the end is clamped to the last page
 */
export const readControlContents = withRole(
  STAFF_ROLES,
  async (_account, { page, take, sort, order, kind, source, genres }: QueryValidator) => {
    const where = and(
      kind.length ? inArray(schema.contents.kind, kind) : undefined,
      source.length ? inArray(schema.contents.source, source) : undefined,
      genres.length ? arrayContains(schema.contents.genres, genres) : undefined
    )
    const direction = order === "asc" ? asc : desc

    const readPage = (pageNo: number) =>
      withPagination(
        db
          .select(contentFields)
          .from(schema.contents)
          .where(where)
          .orderBy(
            direction(SORT_COLUMNS[sort]),
            asc(schema.contents.title),
            asc(schema.contents.id)
          )
          .$dynamic(),
        pageNo,
        take
      )

    /**
     * Count and rows run together; only a jump past the last page pays for a second read.
     */
    const [[{ total }], rows] = await Promise.all([
      db.select({ total: count() }).from(schema.contents).where(where),
      readPage(page)
    ])

    const currentPage = Math.min(page, lastPageOf(total, take))
    const pageRows = currentPage === page ? rows : await readPage(currentPage)

    return toPagination(pageRows, total, currentPage, take)
  }
)

export type ControlContentRow = Awaited<
  ReturnType<typeof readControlContents>
>["data"][number]
