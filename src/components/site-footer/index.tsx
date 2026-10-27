import { Layers01Icon, Wifi01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BrandLogo } from "@/components/brand-logo"
import { Link } from "@/components/link"
import { APP_VERSION } from "@/constants"

import { BackToTop } from "./back-to-top"

const BADGES = [
  {
    icon: Wifi01Icon,
    caption: "Streaming on",
    label: "Home LAN",
    iconClassName: "text-white"
  },
  {
    icon: Layers01Icon,
    caption: "Build",
    label: APP_VERSION,
    iconClassName: "text-white"
  }
]

export function SiteFooter() {
  return (
    <footer className='mt-8 border-t border-t-white/5 sm:mt-16'>
      <div className='max-w-8xl relative mx-auto flex flex-col gap-6 overflow-hidden px-4 py-8 sm:gap-10 sm:px-8'>
        <div
          aria-hidden
          className='via-primary/75 absolute top-0 left-[8%] h-px w-1/2 bg-linear-to-r from-transparent to-transparent'
        />

        <div className='flex flex-wrap items-center justify-between gap-4'>
          <Link href='/'>
            <BrandLogo size='lg' />
          </Link>

          <ul className='flex flex-wrap gap-3'>
            {BADGES.map((badge) => (
              <li
                key={badge.caption}
                className='flex items-center gap-2.5 rounded-sm border border-zinc-900 py-1.75 pr-4 pl-3'>
                <HugeiconsIcon
                  icon={badge.icon}
                  size={22}
                  strokeWidth={1.8}
                  className={badge.iconClassName}
                />
                <div className='flex flex-col'>
                  <span className='text-[10px] tracking-[0.06em] text-zinc-400 uppercase'>
                    {badge.caption}
                  </span>
                  <span className='leading-tight font-semibold'>{badge.label}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className='max-w-150 text-sm leading-relaxed text-zinc-200 sm:text-base'>
          A private cinema for the home network. Every anime, movie, and series on your
          own drives, ready on any screen in the house.
        </p>

        <div className='flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6 sm:pt-7'>
          <p className='text-xs text-zinc-400 sm:text-sm'>
            Copyright {new Date().getFullYear()} &copy; Luminous. Private cinematic
            project.
          </p>
          <div className='hidden sm:block'>
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  )
}
