import type { Metadata } from "next"

import { readSessionAccount } from "@/actions/auth"
import {
  ControlPage,
  PanelBody,
  TableCard
} from "@/app/(controls)/components/control-page"
import { TablePager } from "@/app/(controls)/components/table-pager"

import { readAccountSummary, readControlAccounts } from "./actions/read"
import { AccountSummary } from "./components/account-summary"
import { AccountTable } from "./components/account-table"
import { queryValidator } from "./validator.nuqs"

/**
 * The page blocks by design (plain SSR that reads the session), so it opts out of instant-navigation
 * validation.
 */
export const instant = false

export const metadata: Metadata = { title: "Accounts" }

/**
 * Every account, read-only: accounts are created from the terminal (`tests/account.spec.ts`).
 */
export default async function Accounts({ searchParams }: NextSearchParams) {
  const query = queryValidator.parse(await searchParams)
  const [{ data, ...page }, summary, viewer] = await Promise.all([
    readControlAccounts(query),
    readAccountSummary(),
    readSessionAccount()
  ])

  return (
    <ControlPage
      title='Accounts'
      description='Everyone who can sign in. There is no sign-up: accounts are created from the terminal.'
      aside={
        <PanelBody>
          <AccountSummary summary={summary} />
        </PanelBody>
      }>
      <TableCard footer={<TablePager page={page} />}>
        <AccountTable
          rows={data}
          viewerId={viewer?.id ?? ""}
          current={{ sort: query.sort, order: query.order }}
        />
      </TableCard>
    </ControlPage>
  )
}
