"use client"

import { useCallback, useState } from "react"

import { cls } from "@/libs/utils"

/**
 * Long text cut to six lines, with a toggle to show all of it.
 */
export function ClampedText({ text }: Readonly<{ text: string }>) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = useCallback(() => setIsExpanded((expanded) => !expanded), [])

  return (
    <div className='flex flex-col items-start gap-1'>
      <p
        className={cls(
          "text-sm whitespace-pre-line text-zinc-300",
          !isExpanded && "line-clamp-6"
        )}>
        {text}
      </p>
      <button
        type='button'
        className='cursor-pointer text-xs font-medium text-zinc-400 hover:text-white'
        onClick={handleToggle}>
        {isExpanded ? "Show less" : "Show more"}
      </button>
    </div>
  )
}
