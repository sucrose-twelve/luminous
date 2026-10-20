"use client"

import { Pagination } from "@heroui/react"
import { useEffect, useMemo } from "react"

/**
 * Elements that use the arrow keys themselves (text fields, menus, sliders, radio groups, an open drawer), so
 * the pager leaves the key to them.
 */
const ARROW_KEY_OWNERS = [
  "input",
  "textarea",
  "select",
  "[contenteditable]",
  "[role=menu]",
  "[role=listbox]",
  "[role=slider]",
  "[role=radiogroup]",
  "[role=tablist]",
  "[role=dialog]"
].join(", ")

/**
 * The page numbers the pager shows: the first two, the current page ±1, and the last two, with `"ellipsis"`
 * wherever pages are skipped.
 *
 * @example
 * ```ts
 * pageNumbers(10, 20) // [1, 2, "ellipsis", 9, 10, 11, "ellipsis", 19, 20]
 * pageNumbers(2, 5) // [1, 2, 3, 4, 5]
 * ```
 */
function pageNumbers(current: number, last: number) {
  const pages = new Set([1, 2, current - 1, current, current + 1, last - 1, last])
  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= last)
    .toSorted((a, b) => a - b)

  return sorted.flatMap((page, index): (number | "ellipsis")[] =>
    index > 0 && page - sorted[index - 1] > 1 ? ["ellipsis", page] : [page]
  )
}

/**
 * The pager under a paginated list. `currentPage` comes from the server result, which clamps a page past the
 * end, rather than from the URL; the route's query hook moves the page through `onChange`.
 *
 * On desktop `←` / `→` go to the previous / next page. A held key (`repeat`) and a key pressed while the last
 * change is still loading (`isPending`) are ignored, so one press moves exactly one page. On mobile the page
 * links are replaced by a `current / last` label.
 */
export function Pager({
  currentPage,
  lastPage,
  prevPage,
  nextPage,
  isPending,
  onChange
}: Readonly<{
  currentPage: number
  lastPage: number
  prevPage: number | null
  nextPage: number | null
  isPending: boolean
  onChange: (page: number) => void
}>) {
  const pages = useMemo(() => pageNumbers(currentPage, lastPage), [currentPage, lastPage])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isPending) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.target instanceof Element && event.target.closest(ARROW_KEY_OWNERS))
        return

      const page =
        event.key === "ArrowLeft"
          ? prevPage
          : event.key === "ArrowRight"
            ? nextPage
            : null
      if (page === null) return

      event.preventDefault()
      onChange(page)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPending, prevPage, nextPage, onChange])

  if (lastPage <= 1) return null

  return (
    <Pagination className='justify-center'>
      <Pagination.Content className='gap-2'>
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={prevPage === null}
            onPress={() => prevPage && onChange(prevPage)}>
            <Pagination.PreviousIcon />
            <span>Prev</span>
          </Pagination.Previous>
        </Pagination.Item>

        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <Pagination.Item key={`ellipsis-${index}`} className='max-sm:hidden'>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={page} className='max-sm:hidden'>
              <Pagination.Link
                className='data-[active=true]:bg-theme data-[active=true]:text-background font-bold'
                isActive={page === currentPage}
                onPress={() => onChange(page)}>
                {page}
              </Pagination.Link>
            </Pagination.Item>
          )
        )}

        <Pagination.Item className='px-2 font-bold tabular-nums sm:hidden'>
          {currentPage} / {lastPage}
        </Pagination.Item>

        <Pagination.Item>
          <Pagination.Next
            isDisabled={nextPage === null}
            onPress={() => nextPage && onChange(nextPage)}>
            <span>Next</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  )
}
