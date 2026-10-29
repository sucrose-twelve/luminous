"use client"

import { Copy01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cls } from "@/libs/utils"

/**
 * Copies `value` to the clipboard and confirms with a toast. The Clipboard API needs a secure context, which
 * both dev and prod are (HTTPS).
 *
 * @param label - What is copied, for the button's name and the toast ("Copy ID", "ID copied")
 * @param variant - `icon` beside the value it copies, or `text`: an outlined `Copy <label>` button, for a card's
 * footer
 */
export function CopyButton({
  value,
  label,
  variant = "icon",
  className
}: Readonly<{
  value: string
  label: string
  variant?: "icon" | "text"
  className?: string
}>) {
  /**
   * The label mid-sentence: lowercased, except an acronym such as `ID`.
   */
  const name = label === label.toUpperCase() ? label : label.toLowerCase()

  const handleClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Couldn't copy the ${name}`)
    }
  }, [label, name, value])

  if (variant === "text") {
    return (
      <Button
        type='button'
        variant='outline'
        size='sm'
        className={className}
        onClick={handleClick}>
        <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} data-icon='inline-start' />
        Copy {name}
      </Button>
    )
  }

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon-xs'
      aria-label={`Copy ${name}`}
      className={cls("text-zinc-400 hover:text-white", className)}
      onClick={handleClick}>
      <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
    </Button>
  )
}
