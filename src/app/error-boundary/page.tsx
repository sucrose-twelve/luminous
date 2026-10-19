import { Link } from "@/components/link"

import { searchValidator } from "./validator.nuqs"

export default async function ErrorBoundary({ searchParams }: NextSearchParams) {
  const { msg, ts } = searchValidator.parse(await searchParams)

  return (
    <div className='mx-auto min-h-svh max-w-md'>
      <div className='flex flex-col gap-y-4 py-[20svh]'>
        <div className='text-center select-none'>
          <h1 className='pb-4 text-9xl font-black'>Oops!</h1>
          <h3 className='text-3xl font-bold text-zinc-400'>Unexpected Error</h3>
          <p className='text-zinc-400'>
            An error occurred and you request couldn't be completed.
          </p>
        </div>

        <pre className='w-full overflow-auto rounded-xs text-center'>
          {JSON.stringify({ msg, ts }, null, 2)}
        </pre>

        <Link className='mx-auto mt-4 font-bold' href='/'>
          Go back home
        </Link>
      </div>
    </div>
  )
}
