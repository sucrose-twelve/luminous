"use client"

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { useLoader } from "@/hooks"
import { cls } from "@/libs/utils"

/**
 * The header's search: Enter opens `/browse?search=…`, and `/` focuses it from anywhere outside a text field.
 *
 * From `md` up it is a field in the bar. On phones it folds into an icon button that opens the field over the
 * whole bar, with a button to fold it back.
 *
 * A `type='search'` input, so `Esc` clears it natively; the browser's own clear button is hidden for ours.
 */
export function HeaderSearch() {
  const router = useRouter()
  const loader = useLoader()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [query, setQuery] = useState("")

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const search = query.trim()
      if (!search) return

      loader.on()
      setIsExpanded(false)
      router.push(`/browse?${new URLSearchParams({ search })}`)
    },
    [loader, query, router]
  )

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
    []
  )

  const handleClear = useCallback(() => {
    setQuery("")
    inputRef.current?.focus()
  }, [])

  const handleExpand = useCallback(() => setIsExpanded(true), [])
  const handleCollapse = useCallback(() => setIsExpanded(false), [])

  /**
   * On phones the field is `display: none` until expanded, so focus it once it is shown.
   */
  useEffect(() => {
    if (isExpanded) inputRef.current?.focus()
  }, [isExpanded])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select"))
      ) {
        return
      }

      event.preventDefault()
      setIsExpanded(true)
      inputRef.current?.focus()
    }

    addEventListener("keydown", handleKeyDown)
    return () => removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      <Button
        variant='ghost'
        size='icon'
        aria-label='Search'
        className='size-11 rounded-lg text-white md:hidden'
        onClick={handleExpand}>
        <HugeiconsIcon className='size-5' icon={Search01Icon} strokeWidth={2} />
      </Button>

      <div
        className={cls(
          "items-center gap-1 md:flex",
          isExpanded
            ? "max-md:absolute max-md:inset-0 max-md:z-10 max-md:flex max-md:rounded-[inherit] max-md:bg-black max-md:pr-1.5 max-md:pl-2"
            : "hidden"
        )}>
        <form role='search' className='grow' onSubmit={handleSubmit}>
          <InputGroup className='ring-foreground/5 h-10 rounded-lg border-0 bg-transparent ring-2 dark:bg-transparent'>
            <InputGroupInput
              ref={inputRef}
              type='search'
              name='search'
              aria-label='Search titles'
              placeholder='Search titles'
              enterKeyHint='search'
              value={query}
              className='placeholder:text-foreground/25 w-36 [&::-webkit-search-cancel-button]:hidden'
              onChange={handleChange}
            />
            <InputGroupAddon className='text-zinc-400'>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </InputGroupAddon>
            {query ? (
              <InputGroupAddon align='inline-end'>
                <InputGroupButton
                  size='icon-xs'
                  aria-label='Clear search'
                  className='text-zinc-400'
                  onClick={handleClear}>
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
            <InputGroupAddon align='inline-end' className='max-md:hidden'>
              <Kbd className='me-1'>/</Kbd>
            </InputGroupAddon>
          </InputGroup>
        </form>

        <Button
          variant='ghost'
          size='icon'
          aria-label='Close search'
          className='size-11 rounded-xl text-white md:hidden'
          onClick={handleCollapse}>
          <HugeiconsIcon className='size-5' icon={Cancel01Icon} strokeWidth={1.8} />
        </Button>
      </div>
    </>
  )
}
