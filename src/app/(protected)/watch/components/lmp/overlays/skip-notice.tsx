import type { SkipNotice as SkipNoticeState } from "../hooks/use-skips"

const MESSAGES: Record<Content.Skip["kind"], string> = {
  intro: "Intro skipped",
  recap: "Recap skipped",
  outro: "Credits skipped"
}

/**
 * The bottom-left notice after Auto Skip jumped a range, with Undo to go back to its start. `useSkips` takes
 * it down after a few seconds.
 */
export function SkipNotice({
  notice,
  onUndo
}: Readonly<{ notice: SkipNoticeState; onUndo: () => void }>) {
  return (
    <div
      role='status'
      className='border-gradient pointer-events-auto flex items-center gap-1 rounded-xl bg-black/50 py-1.5 pr-1.5 pl-4 text-sm text-white backdrop-blur-md'>
      <span>{MESSAGES[notice.skip.kind]}</span>
      <span aria-hidden className='text-white/40'>
        ·
      </span>
      <button
        type='button'
        onClick={onUndo}
        className='cursor-pointer rounded-lg px-2.5 py-1 font-medium transition-colors hover:bg-white/10 focus-visible:bg-white/10'>
        Undo
      </button>
    </div>
  )
}
