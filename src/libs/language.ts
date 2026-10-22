import type { Locales } from "@/constants/enum"

/**
 * The short code an audio is listed under, the region of its locale: `ja-JP` → `JP`.
 */
export function languageCode(language: Locales) {
  return language.split("-")[1] ?? language
}

const languageNames = new Intl.DisplayNames(["en"], { type: "language" })

/**
 * A language's English name: `ja-JP` → `Japanese`.
 */
export function languageName(language: Locales) {
  return languageNames.of(language.split("-")[0]) ?? language
}

/**
 * Reads an episode's audios out for screen readers, e.g. `"Japanese, Thai dub"`.
 */
export function audiosLabel(audios: readonly { language: Locales; isDubbed: boolean }[]) {
  return audios
    .map(({ language, isDubbed }) => {
      const name = languageName(language)
      return isDubbed ? `${name} dub` : name
    })
    .join(", ")
}
