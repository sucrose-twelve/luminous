import {
  Geist,
  Geist_Mono,
  Noto_Sans_JP as Japanese,
  Noto_Sans_Thai as Thai
} from "next/font/google"

export const fontGeist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist"
})

export const fontGeistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono"
})

export const fontThai = Thai({
  subsets: ["latin", "thai"],
  display: "swap",
  variable: "--font-thai"
})

export const fontJapanese = Japanese({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-japanese"
})
