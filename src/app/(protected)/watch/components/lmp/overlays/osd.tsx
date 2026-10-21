import type { OsdMessage } from "../hooks/use-osd"

/**
 * The on-screen message, a toast at the top center under the top bar (`docs/design/LMP.png`). Keyed by
 * message, so each new one restarts the fade.
 */
export function Osd({ message }: Readonly<{ message: OsdMessage | null }>) {
  return (
    <div
      aria-live='polite'
      className='pointer-events-none absolute inset-x-0 top-14 flex justify-center px-4 sm:top-20'>
      {message && (
        <span
          key={message.id}
          className='animate-osd border-gradient rounded-full bg-black/40 px-5 py-2 text-sm font-medium text-white tabular-nums backdrop-blur-md'>
          {message.text}
        </span>
      )}
    </div>
  )
}
