"use client"

import { useCallback, useMemo } from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import { useControlQuery } from "../hooks/use-control-query"

const ALL = "all"

const ITEM_CLASS =
  "h-6 rounded-md bg-transparent px-2.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground"

/**
 * A single-choice filter above a detail page's table: `All` first, then every option, applied at once. Exactly
 * one item stays pressed; pressing the pressed one again changes nothing (Base UI would empty the group).
 *
 * @param param - The search param it writes, as a one-item list (`useControlQuery`)
 * @param value - The page's current value, or `null` for all
 */
export function ToggleFilter<T extends string>({
  label,
  param,
  items,
  value
}: Readonly<{
  label: string
  param: "kind" | "status" | "audio"
  items: readonly { value: T; label: string }[]
  value: T | null
}>) {
  const { update } = useControlQuery()
  const pressed = useMemo(() => [value ?? ALL], [value])

  const handleChange = useCallback(
    (values: string[]) => {
      const [key] = values
      if (!key || key === (value ?? ALL)) return
      update({ [param]: key === ALL ? null : [key] })
    },
    [param, update, value]
  )

  return (
    <div className='bg-foreground/5 flex items-center gap-2 rounded-lg p-1'>
      <span className='pl-2 text-xs text-zinc-500'>{label}:</span>
      <ToggleGroup
        aria-label={label}
        className='gap-0.5'
        value={pressed}
        onValueChange={handleChange}>
        <ToggleGroupItem value={ALL} className={ITEM_CLASS}>
          All
        </ToggleGroupItem>
        {items.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value} className={ITEM_CLASS}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
