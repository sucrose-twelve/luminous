"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { cls } from "@/libs/utils"

export type SelectOption<T extends string> = { value: T; label: string }

/**
 * A select for the control panel's forms, driven by a react-hook-form `Controller`. `items` also labels the
 * trigger, which shows the raw value without them.
 */
export function FormSelect<T extends string>({
  id,
  items,
  value,
  placeholder,
  isInvalid,
  className,
  onChange
}: Readonly<{
  id?: string
  items: readonly SelectOption<T>[]
  value: T | null
  placeholder?: string
  isInvalid?: boolean
  className?: string
  onChange: (value: T) => void
}>) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        const item = items.find((option) => option.value === next)
        if (item) onChange(item.value)
      }}>
      <SelectTrigger
        id={id}
        aria-invalid={isInvalid}
        className={cls("w-full data-[size=default]:h-9", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
