"use client"

import { Fragment } from "react"

import { Link } from "@/components/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const TRAIL = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" }
] as const

/**
 * `Home > Browse > <content title>` at the top of the page. The content title is the current page: plain text
 * (no link), cut to `max-w-xs`, with the full title in a tooltip below it. It is focusable so keyboard users
 * can open that tooltip too.
 *
 * The links go through `@/components/link`, which starts the loader bar.
 */
export function SeasonBreadcrumbs({ contentTitle }: Readonly<{ contentTitle: string }>) {
  return (
    <Breadcrumb className='mb-8 sm:mb-12'>
      <BreadcrumbList className='flex-nowrap gap-2.5'>
        {TRAIL.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbItem>
              <Link
                className='text-sm font-medium text-zinc-400 transition-colors hover:text-white'
                href={crumb.href}>
                {crumb.label}
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator className='text-zinc-500 [&>svg]:size-3' />
          </Fragment>
        ))}

        <BreadcrumbItem className='min-w-0 shrink'>
          <Tooltip>
            <TooltipTrigger
              delay={200}
              render={
                <BreadcrumbPage
                  tabIndex={0}
                  className='max-w-xs min-w-0 cursor-default truncate text-sm font-medium text-white'
                />
              }>
              {contentTitle}
            </TooltipTrigger>
            <TooltipContent side='bottom'>{contentTitle}</TooltipContent>
          </Tooltip>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
