import type { Metadata } from "next"

import { ContentForm } from "./form"

export const metadata: Metadata = { title: "Import content" }

export default function ImportContent() {
  return (
    <>
      <h1>Import content</h1>
      <ContentForm />
    </>
  )
}
