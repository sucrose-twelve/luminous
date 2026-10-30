import NextLink from "next/link"

import { searchValidator } from "./validator.nuqs"

/**
 * Where `ErrorBoundary` redirects (`401`, `403`, `423`). It sits under the root layout only, so it uses
 * `next/link` rather than `@/components/link`: there is no `MainStoreProvider` here, which the top loader needs.
 */
export default async function ErrorBoundary({ searchParams }: NextSearchParams) {
  const { msg, ts } = searchValidator.parse(await searchParams)

  return (
    <div className='mx-auto min-h-svh max-w-md'>
      <div className='flex flex-col gap-y-4 py-[20svh]'>
        <div className='text-center select-none'>
          <h1 className='pb-4 text-9xl font-black'>Oops!</h1>
          <h3 className='text-3xl font-bold text-zinc-400'>Unexpected Error</h3>
          <p className='text-zinc-400'>
            An error occurred and your request couldn't be completed.
          </p>
        </div>

        <pre className='w-full overflow-auto rounded-xs text-center'>
          {JSON.stringify({ msg, ts }, null, 2)}
        </pre>

        <NextLink className='mx-auto mt-4 font-bold' href='/'>
          Go back home
        </NextLink>
      </div>
    </div>
  )
}
