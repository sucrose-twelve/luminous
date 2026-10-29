import { PanelSection } from "@/app/(controls)/components/control-page"
import { CopyButton } from "@/app/(controls)/components/copy-button"
import { ROLE_LABELS, ROLES } from "@/constants"

import type { readAccountSummary } from "../actions/read"

/**
 * The command that creates an account: there is no sign-up, and the panel can't create one yet.
 */
const ADD_COMMAND = "bun tests/account.spec.ts --email <email> --password <password>"

/**
 * The accounts page's side panel: counts per role and status, and how to add an account.
 */
export function AccountSummary({
  summary
}: Readonly<{ summary: Awaited<ReturnType<typeof readAccountSummary>> }>) {
  const suspended = summary.reduce((sum, row) => sum + row.suspended, 0)
  const inactive = summary.reduce((sum, row) => sum + row.inactive, 0)
  const rows = [
    ...ROLES.map((role) => ({
      label: ROLE_LABELS[role],
      value: summary.find((row) => row.role === role)?.total ?? 0
    })),
    { label: "Suspended", value: suspended },
    { label: "Inactive", value: inactive }
  ]

  return (
    <>
      <PanelSection title='Summary'>
        <dl className='grid grid-cols-[1fr_auto] gap-y-2 text-sm'>
          {rows.map((row) => (
            <div key={row.label} className='contents'>
              <dt className='text-zinc-400'>{row.label}</dt>
              <dd className='text-right font-medium tabular-nums'>{row.value}</dd>
            </div>
          ))}
        </dl>
      </PanelSection>

      <PanelSection title='Add an account'>
        <p className='text-xs text-zinc-400'>
          There is no sign-up. Create an account from the server&apos;s terminal; add{" "}
          <code className='font-mono'>--role admin</code> or{" "}
          <code className='font-mono'>--username …</code> when needed.
        </p>
        <div className='flex items-start gap-2 rounded-lg bg-black/40 p-3'>
          <code className='min-w-0 grow font-mono text-xs break-all text-zinc-300'>
            {ADD_COMMAND}
          </code>
          <CopyButton value={ADD_COMMAND} label='Command' />
        </div>
      </PanelSection>
    </>
  )
}
