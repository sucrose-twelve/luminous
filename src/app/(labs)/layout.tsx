import { notFound } from "next/navigation"

import { ENV } from "@/constants/env"
import { MainStoreProvider } from "@/stores/main"

export default function LabsLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  if (ENV.APP_MODE === "production") {
    notFound()
  }

  return (
    <MainStoreProvider account={null}>
      <main className='p-8'>{children}</main>
    </MainStoreProvider>
  )
}
