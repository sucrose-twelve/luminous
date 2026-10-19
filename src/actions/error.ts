import { redirect, RedirectType } from "next/navigation"

export function ErrorBoundary(message: string, cause?: unknown): never {
  console.error(message, cause)
  redirect(
    `/error-boundary?msg=${encodeURIComponent(message)}&ts=${Date.now()}`,
    RedirectType.replace
  )
}
