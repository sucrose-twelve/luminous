"use client"

import JsonView from "@uiw/react-json-view"
import { darkTheme } from "@uiw/react-json-view/dark"

export default function ({ value }: Readonly<{ value: object }>) {
  return (
    <JsonView
      className='overflow-auto rounded-xs p-4 ring-1 ring-zinc-900'
      style={{
        ...darkTheme,
        fontFamily:
          "var(--font-geist-mono), var(--font-thai), var(--font-japanese), sans-serif",
        fontSize: "var(--text-xs)",
        backgroundColor: "var(--color-background)",
        maxHeight: "75svh"
      }}
      value={value}
      enableClipboard={false}
      displayDataTypes={false}
      displayObjectSize={false}
      shortenTextAfterLength={0}
    />
  )
}
