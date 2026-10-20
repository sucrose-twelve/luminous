import { buttonVariants } from "@heroui/react"
import { PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Link } from "@/components/link"
import { cls } from "@/libs/utils"

/**
 * The card's Continue button: a link to the shown episode, styled as a button. Not prefetched, so a full page
 * of cards doesn't make the server render every watch page.
 */
export function ContinueLink({
  href,
  className
}: Readonly<{ href: string; className?: string }>) {
  return (
    <Link
      className={cls(
        buttonVariants({ variant: "primary", size: "sm" }),
        "bg-foreground text-background h-9 rounded-lg px-4 font-bold",
        className
      )}
      href={href}
      prefetch={false}>
      <HugeiconsIcon className='size-5' icon={PlayIcon} strokeWidth={2} />
      Continue
    </Link>
  )
}
