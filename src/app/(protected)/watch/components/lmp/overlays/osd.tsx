import type { OsdMessage } from "../hooks/use-osd"

/**
 * The centered on-screen message. Keyed by message, so each new one restarts the fade.
 */
export function Osd({ message }: Readonly<{ message: OsdMessage | null }>) {
  return (
    <div
      aria-live='polite'
      className='pointer-events-none absolute inset-0 grid place-items-center'>
      {message && (
        <span
          key={message.id}
          className='animate-osd rounded-md bg-black/60 px-5 py-2.5 text-lg font-medium text-white tabular-nums backdrop-blur-sm'>
          {message.text}
        </span>
      )}
    </div>
  )
}
