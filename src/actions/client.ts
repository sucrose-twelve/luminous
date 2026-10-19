"use server"

import { headers } from "next/headers"

export async function clientInfo() {
  const headerStore = await headers()
  const userAgent = headerStore.get("user-agent") ?? "unknown"
  // x-forwarded-for can be comma separated: client, proxy1, proxy2
  const xff = headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip") ?? ""
  const ip =
    xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)[0] ?? "unknown"

  return { userAgent, ip }
}
