import { cls } from "@/libs/utils"

/**
 * Animated light around the edges of the nearest positioned parent, used as a loading indicator. Purely
 * decorative: the caller owns the `role='status'` and its label. Styles live in `styles/components/edge-light.css`.
 */
export function EdgeLight({ className }: Readonly<{ className?: string }>) {
  return (
    <div aria-hidden className={cls("edge-light", className)}>
      <div className='edge-light-glow'>
        <span className='edge-light-beam' />
      </div>
      <div className='edge-light-line'>
        <span className='edge-light-beam' />
      </div>
    </div>
  )
}
