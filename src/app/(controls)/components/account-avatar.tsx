import Image from "next/image"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

/**
 * An account's avatar, or its initial when `profiles.avatar` isn't a site path: accounts made by
 * `tests/account.spec.ts` keep the column default (`default-avatar.webp`), which `next/image` would reject.
 */
export function AccountAvatar({
  avatar,
  name,
  size
}: Readonly<{ avatar: string | null; name: string; size: number }>) {
  const hasImage = avatar?.startsWith("/") ?? false

  return (
    <Avatar
      className='ring-foreground/10 shrink-0 rounded-lg ring-2 after:rounded-lg'
      style={{ width: size, height: size }}>
      {hasImage && avatar ? (
        <Image
          className='size-full rounded-lg object-cover'
          alt=''
          src={avatar}
          width={size}
          height={size}
          quality={100}
        />
      ) : (
        <AvatarFallback className='rounded-lg text-xs font-semibold uppercase'>
          {name.slice(0, 1)}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
