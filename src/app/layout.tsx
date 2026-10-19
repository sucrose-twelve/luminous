import { NuqsAdapter } from "nuqs/adapters/next/app"

import { Locales } from "@/constants/enum"
import { fontGeist, fontGeistMono, fontJapanese, fontThai } from "@/constants/fonts"
import { cls } from "@/libs/utils"

import "@/styles/globals.css"

export { metadata, viewport } from "@/constants/metadata"

export const instant = false

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang={Locales.US} style={{ colorScheme: "dark" }}>
      <body
        className={cls(
          "dark",
          fontGeist.variable,
          fontGeistMono.variable,
          fontThai.variable,
          fontJapanese.variable
        )}>
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  )
}
