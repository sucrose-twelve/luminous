"use client"

import { Button, Kbd, SearchField } from "@heroui/react"
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { useLoader } from "@/hooks"
import { cls } from "@/libs/utils"

/**
 * The header's search: Enter opens `/browse?search=…`, and `/` focuses it from anywhere outside a text field.
 *
 * From `md` up it is a field in the bar. On phones it folds into an icon button that opens the field over the
 * whole bar, with a button to fold it back.
 */
export function HeaderSearch() {
  const router = useRouter()
  const loader = useLoader()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = useCallback(
    (value: string) => {
      const search = value.trim()
      if (!search) return

      loader.on()
      setIsExpanded(false)
      router.push(`/browse?${new URLSearchParams({ search })}`)
    },
    [loader, router]
  )

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
        isIconOnly
        variant='ghost'
        aria-label='Search'
        className='size-11 rounded-lg text-white md:hidden'
        onPress={handleExpand}>
        <HugeiconsIcon className='size-5' icon={Search01Icon} strokeWidth={2} />
      </Button>

      <div
        className={cls(
          "items-center gap-1 md:flex",
          isExpanded
            ? "max-md:absolute max-md:inset-0 max-md:z-10 max-md:flex max-md:rounded-[inherit] max-md:bg-black max-md:pr-1.5 max-md:pl-2"
            : "hidden"
        )}>
        <SearchField
          aria-label='Search titles'
          name='search'
          variant='secondary'
          className='grow'
          onSubmit={handleSubmit}>
          <SearchField.Group className='ring-foreground/5 h-10 rounded-lg bg-transparent ring-2'>
            <SearchField.SearchIcon className='text-zinc-400' />
            <SearchField.Input
              ref={inputRef}
              placeholder='Search titles'
              enterKeyHint='search'
              className='placeholder:text-foreground/25 w-36'
            />
            <SearchField.ClearButton className='text-zinc-400' />
            <Kbd variant='light' className='me-2 max-md:hidden'>
              <Kbd.Content>/</Kbd.Content>
            </Kbd>
          </SearchField.Group>
        </SearchField>

        <Button
          isIconOnly
          variant='ghost'
          aria-label='Close search'
          className='size-11 rounded-xl text-white md:hidden'
          onPress={handleCollapse}>
          <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.8} />
        </Button>
      </div>
    </>
  )
}
