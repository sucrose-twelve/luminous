"use client"

import { Pagination } from "@heroui/react"
import { useEffect, useMemo } from "react"

import { useBrowseQuery } from "../hooks/use-browse-query"
import { pageNumbers } from "../utils"

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
 * The pager under the grid. `currentPage` comes from the server result, which clamps a page past the end,
 * rather than from the URL.
 *
 * On desktop `←` / `→` go to the previous / next page. A held key (`repeat`) and a key pressed while the last
 * change is still loading are ignored, so one press moves exactly one page. On mobile the page links are
 * replaced by a `current / last` label.
 */
export function BrowsePagination({
  currentPage,
  lastPage,
  prevPage,
  nextPage
}: Readonly<{
  currentPage: number
  lastPage: number
  prevPage: number | null
  nextPage: number | null
}>) {
  const { isPending, update } = useBrowseQuery()
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
      update({ page })
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPending, prevPage, nextPage, update])

  if (lastPage <= 1) return null

  return (
    <Pagination className='justify-center'>
      <Pagination.Content className='gap-2'>
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={prevPage === null}
            onPress={() => prevPage && update({ page: prevPage })}>
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
                onPress={() => update({ page })}>
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
            onPress={() => nextPage && update({ page: nextPage })}>
            <span>Next</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  )
}
