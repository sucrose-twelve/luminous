import { AccountAvatar } from "@/app/(controls)/components/account-avatar"
import { TableEmpty } from "@/app/(controls)/components/control-page"
import { RoleBadge } from "@/app/(controls)/components/role-badge"
import { PlainHead, SortHead } from "@/app/(controls)/components/sort-head"
import { formatDate, formatDateTime } from "@/app/(controls)/utils"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Order } from "@/constants"

import type { ControlAccountRow } from "../actions/read"
import { statusChips } from "../utils"

/**
 * The accounts table (read-only). The signed-in account is marked `You`.
 */
export function AccountTable({
  rows,
  viewerId,
  current
}: Readonly<{
  rows: ControlAccountRow[]
  viewerId: string
  current: { sort: string; order: Order }
}>) {
  return (
    <Table>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <SortHead column='username' label='Account' current={current} />
          <SortHead column='displayName' label='Display name' current={current} />
          <SortHead column='role' label='Role' current={current} />
          <PlainHead label='Status' />
          <SortHead column='joined' label='Joined' current={current} firstOrder='desc' />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? <TableEmpty colSpan={5}>No accounts yet.</TableEmpty> : null}

        {rows.map((row) => (
          <TableRow key={row.account.id}>
            <TableCell className='py-3'>
              <div className='flex items-center gap-3'>
                <AccountAvatar
                  avatar={row.profile?.avatar ?? null}
                  name={row.account.username}
                  size={36}
                />
                <div className='flex min-w-0 flex-col'>
                  <span className='flex items-center gap-2 font-medium'>
                    <span className='truncate'>{row.account.username}</span>
                    {row.account.id === viewerId ? (
                      <Badge variant='outline' className='h-4 px-1.5 text-[10px]'>
                        You
                      </Badge>
                    ) : null}
                  </span>
                  <span className='truncate text-xs text-zinc-400'>
                    {row.account.email}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell>{row.profile?.displayName ?? "—"}</TableCell>
            <TableCell>
              <RoleBadge role={row.account.role} />
            </TableCell>
            <TableCell>
              <div className='flex flex-wrap gap-1.5'>
                {statusChips(row).map((chip) =>
                  chip.title ? (
                    <Tooltip key={chip.key}>
                      <TooltipTrigger
                        delay={0}
                        render={<Badge tabIndex={0} className={chip.className} />}>
                        {chip.label}
                      </TooltipTrigger>
                      <TooltipContent>{chip.title}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Badge key={chip.key} className={chip.className}>
                      {chip.label}
                    </Badge>
                  )
                )}
              </div>
            </TableCell>
            <TableCell>
              <Tooltip>
                <TooltipTrigger
                  delay={200}
                  render={<span tabIndex={0} className='cursor-default' />}>
                  {formatDate(row.account.createdAt)}
                </TooltipTrigger>
                <TooltipContent>{formatDateTime(row.account.createdAt)}</TooltipContent>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
