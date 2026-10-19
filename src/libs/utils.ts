import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cls(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Pads a number to two digits, e.g. `pad2(5) // "05"`.
 */
export const pad2 = (value: number) => String(value).padStart(2, "0")

export function slugify(text: string) {
  return text
    .normalize("NFD") // Split accented characters into their base letters and diacritical marks
    .replace(/[\u0300-\u036f]/g, "") // Remove all punctuated accent marks
    .toLowerCase() // Convert to lowercase
    .trim() // Trim whitespace from both ends
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars (except hyphens)
    .replace(/\-\-+/g, "-") // Replace multiple hyphens with a single one
}
