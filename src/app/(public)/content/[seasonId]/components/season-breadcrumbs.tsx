"use client"

import { Breadcrumbs, Tooltip } from "@heroui/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Link } from "@/components/link"

const TRAIL = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" }
] as const

/**
 * `Home > Browse > <content title>` at the top of the page. The content title is the current page: plain text
 * (no link), cut to `max-w-2xs`, with the full title in a tooltip below it.
 *
 * Every item uses the function-children form and draws its own separator. A HeroUI item with `href` renders a
 * plain `<a>` (the app has no React Aria `RouterProvider`), which reloads the page and skips the loader bar,
 * so the links go through `@/components/link` instead.
 */
export function SeasonBreadcrumbs({ contentTitle }: Readonly<{ contentTitle: string }>) {
  return (
    <Breadcrumbs className='mb-8 gap-x-2.5 sm:mb-12'>
      {TRAIL.map((crumb) => (
        <Breadcrumbs.Item className='gap-x-2.5' key={crumb.href}>
          {() => (
            <>
              <Link
                className='text-sm font-medium text-zinc-400 transition-colors hover:text-white'
                href={crumb.href}>
                {crumb.label}
              </Link>
              <span className='text-zinc-500' aria-hidden>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  color='currentColor'
                  size={12}
                  strokeWidth={2}
                />
              </span>
            </>
          )}
        </Breadcrumbs.Item>
      ))}

      <Breadcrumbs.Item className='min-w-0 shrink gap-x-2.5'>
        {() => (
          <Tooltip delay={200}>
            <Tooltip.Trigger
              className='max-w-xs min-w-0 cursor-default truncate text-sm font-medium text-white'
              aria-current='page'>
              {contentTitle}
            </Tooltip.Trigger>
            <Tooltip.Content placement='bottom'>{contentTitle}</Tooltip.Content>
          </Tooltip>
        )}
      </Breadcrumbs.Item>
    </Breadcrumbs>
  )
}
