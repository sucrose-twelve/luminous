import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: {
    default: "Luminous • Private cinematic project",
    template: "%s • Luminous • Private cinematic project"
  },
  description:
    "Generate Lorem Ipsum placeholder text. Select the number of characters, words, sentences or paragraphs, and hit generate!",
  robots: { index: false, follow: false },
  icons: [
    {
      rel: "icon",
      url: "/static/favicon/icon-light-32x32.png",
      type: "image/png",
      sizes: "32x32",
      media: "(prefers-color-scheme: light)"
    },
    {
      rel: "icon",
      url: "/static/favicon/icon-dark-32x32.png",
      type: "image/png",
      sizes: "32x32",
      media: "(prefers-color-scheme: dark)"
    },
    {
      rel: "icon",
      url: "/static/favicon/icon.svg",
      sizes: "32x32",
      type: "image/svg+xml"
    },
    {
      rel: "apple-touch-icon",
      url: "/static/favicon/apple-touch-icon.png",
      type: "image/png"
    }
  ],
  manifest: "/app.webmanifest"
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" }
  ]
}
