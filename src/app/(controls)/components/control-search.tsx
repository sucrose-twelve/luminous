"use client"

import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLoader } from "@/hooks"

const SEASONS_PATH = "/ctrl/seasons"

/**
 * The header's search: every search opens `/ctrl/seasons?search=…`, which matches content titles (with their
 * alternative titles) and season titles. On that page the field shows the current search.
 *
 * The field is uncontrolled and keyed by the current search, so it resets when the URL changes and never
 * re-renders while typing.
 */
export function ControlSearch() {
  const router = useRouter()
  const loader = useLoader()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = pathname === SEASONS_PATH ? (searchParams.get("search") ?? "") : ""

  const handleSubmit = useCallback(
    (event: React.SubmitEvent<HTMLFormElement>) => {
      event.preventDefault()
      const search = String(new FormData(event.currentTarget).get("search") ?? "").trim()
      if (!search || search === current) return

      loader.on()
      router.push(`${SEASONS_PATH}?${new URLSearchParams({ search })}`)
    },
    [current, loader, router]
  )

  return (
    <form role='search' className='flex items-center gap-2' onSubmit={handleSubmit}>
      <Input
        key={current}
        name='search'
        type='search'
        defaultValue={current}
        aria-label='Search seasons'
        placeholder='Search titles…'
        className='h-9 w-80 rounded-lg'
      />
      <Button
        type='submit'
        variant='outline'
        size='icon'
        aria-label='Search'
        className='size-9 rounded-lg'>
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
      </Button>
    </form>
  )
}
