import { Fragment } from "react"

import { Link } from "@/components/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { TableCell, TableRow } from "@/components/ui/table"
import { cls } from "@/libs/utils"

export type Crumb = { label: string; href?: string }

/**
 * A control panel page (`docs/design/controls/page-layout.png`): the page (`-L`, grows) beside a sticky panel
 * (`-R`, 320px) no taller than the window.
 *
 * @param breadcrumbs - The trail above the title on detail pages; the last crumb is the current page
 * @param actions - Buttons on the right of the title
 * @param aside - The panel's content: a `PanelBody`, which scrolls, then an optional `PanelFooter`, which
 * stays at the bottom
 */
export function ControlPage({
  title,
  description,
  breadcrumbs,
  actions,
  aside,
  children
}: Readonly<{
  title: string
  description?: React.ReactNode
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
  aside: React.ReactNode
  children: React.ReactNode
}>) {
  return (
    <div className='grid grid-cols-[minmax(0,1fr)_320px] items-start gap-8'>
      <section className='flex min-w-0 flex-col gap-6'>
        <header className='flex items-end justify-between gap-6'>
          <div className='flex min-w-0 flex-col gap-1.5'>
            {breadcrumbs ? <Crumbs crumbs={breadcrumbs} /> : null}
            <h1 className='truncate text-2xl font-bold'>{title}</h1>
            {description ? (
              <p className='truncate text-xs text-zinc-400'>{description}</p>
            ) : null}
          </div>
          {actions ? <div className='flex shrink-0 gap-2'>{actions}</div> : null}
        </header>

        {children}
      </section>

      <aside className='sticky top-38 flex max-h-[calc(100svh-10rem)] flex-col overflow-hidden rounded-2xl bg-zinc-900/60'>
        {aside}
      </aside>
    </div>
  )
}

function Crumbs({ crumbs }: Readonly<{ crumbs: Crumb[] }>) {
  return (
    <Breadcrumb>
      <BreadcrumbList className='flex-nowrap gap-2'>
        {crumbs.map((crumb, index) => (
          <Fragment key={`${index}-${crumb.label}`}>
            {index > 0 ? (
              <BreadcrumbSeparator className='text-zinc-600 [&>svg]:size-3' />
            ) : null}
            <BreadcrumbItem className='min-w-0'>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className='truncate text-xs font-medium text-zinc-400 transition-colors hover:text-white'>
                  {crumb.label}
                </Link>
              ) : (
                <BreadcrumbPage className='truncate text-xs font-medium text-zinc-300'>
                  {crumb.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/**
 * The card a page's table sits in, with an optional bar above the table (filters) and below it (pager).
 */
export function TableCard({
  toolbar,
  footer,
  children
}: Readonly<{
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}>) {
  return (
    <div className='flex flex-col rounded-2xl bg-zinc-900/60'>
      {toolbar ? (
        <div className='flex items-center gap-4 border-b border-white/5 px-5 py-3'>
          {toolbar}
        </div>
      ) : null}
      <div className='px-2 py-1'>{children}</div>
      {footer ? <div className='border-t border-white/5 px-5 py-3'>{footer}</div> : null}
    </div>
  )
}

/**
 * The one row of a table with nothing to show.
 */
export function TableEmpty({
  colSpan,
  children
}: Readonly<{ colSpan: number; children: React.ReactNode }>) {
  return (
    <TableRow className='hover:bg-transparent'>
      <TableCell colSpan={colSpan} className='py-16 text-center text-sm text-zinc-400'>
        {children}
      </TableCell>
    </TableRow>
  )
}

/**
 * The side panel's content, scrolling on its own when the panel would be taller than the window.
 */
export function PanelBody({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className='flex min-h-0 scrollbar-none flex-col gap-6 overflow-y-auto p-5'>
      {children}
    </div>
  )
}

/**
 * The side panel's bottom bar, under `PanelBody`. It's outside the scrolling body, so it stays flush with the
 * panel's bottom edge however far the body scrolls.
 */
export function PanelFooter({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className='flex shrink-0 gap-2 border-t border-white/5 px-5 py-4'>
      {children}
    </div>
  )
}

/**
 * A titled block of the side panel.
 */
export function PanelSection({
  title,
  className,
  children
}: Readonly<{ title: string; className?: string; children: React.ReactNode }>) {
  return (
    <section className={cls("flex flex-col gap-3", className)}>
      <h2 className='text-xs font-semibold tracking-wide text-zinc-500 uppercase'>
        {title}
      </h2>
      {children}
    </section>
  )
}
