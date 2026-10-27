"use client"

import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"

export default function Error({
  error,
  reset
}: Readonly<{
  error: Error & { digest?: string }
  reset: () => void
}>) {
  return (
    <div className='mx-auto min-h-svh max-w-md'>
      <div className='flex flex-col gap-y-4 py-[20svh]'>
        <div className='text-center select-none'>
          <h1 className='mb-4 text-9xl font-black'>Oops!</h1>
          <h3 className='text-3xl font-bold text-zinc-400'>Unexpected Error</h3>
          <p className='text-zinc-400'>
            An error occurred and you request couldn't be completed.
          </p>
        </div>

        <code className='use-mirror w-full overflow-auto rounded-xs text-center'>
          {error?.digest ? `Digest: ${error.digest}` : "Something went wrong."}
        </code>

        <div className='mt-4 flex justify-center gap-4'>
          <Button variant='ghost' size='lg' onClick={reset}>
            Try again
          </Button>

          <Link className={buttonVariants({ size: "lg" })} href='/'>
            Go back home
          </Link>
        </div>
      </div>
    </div>
  )
}
