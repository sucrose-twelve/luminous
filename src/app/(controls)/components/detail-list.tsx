import { cls } from "@/libs/utils"

import { CopyButton } from "./copy-button"

/**
 * The label / value rows of a detail panel.
 */
export function DetailList({ children }: Readonly<{ children: React.ReactNode }>) {
  return <dl className='flex flex-col gap-2.5 text-sm'>{children}</dl>
}

/**
 * One row of a `DetailList`: the label on the left, the value on the right (`stacked` puts it below, for long
 * values such as paths).
 */
export function DetailRow({
  label,
  stacked,
  children
}: Readonly<{ label: string; stacked?: boolean; children: React.ReactNode }>) {
  return (
    <div
      className={cls(
        "flex gap-3",
        stacked ? "flex-col gap-1" : "items-start justify-between"
      )}>
      <dt className='shrink-0 text-zinc-400'>{label}</dt>
      <dd className={cls("min-w-0", stacked ? "" : "text-right")}>{children}</dd>
    </div>
  )
}

/**
 * An ID cut to its first 8 characters, with a button that copies all of it.
 */
export function ShortId({ id }: Readonly<{ id: string }>) {
  return (
    <span className='inline-flex items-center gap-1'>
      <code className='font-mono text-xs' title={id}>
        {id.slice(0, 8)}
      </code>
      <CopyButton value={id} label='ID' />
    </span>
  )
}

/**
 * A full path on disk, wrapping anywhere, with a copy button.
 */
export function PathValue({
  path,
  label = "Path"
}: Readonly<{ path: string; label?: string }>) {
  return (
    <span className='flex items-start gap-1'>
      <code className='min-w-0 grow font-mono text-xs break-all text-zinc-300'>
        {path}
      </code>
      <CopyButton value={path} label={label} />
    </span>
  )
}
