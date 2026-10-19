"use client"

import Link from "next/link"

export default function NotFound() {
  return (
    <div className='mx-auto min-h-svh max-w-lg'>
      <div className='flex flex-col gap-y-4 py-[20svh]'>
        <div className='text-center select-none'>
          <h1 className='mb-4 text-9xl font-extrabold'>404</h1>
          <h3 className='text-4xl font-bold text-zinc-400 capitalize'>
            oops, this page not found!
          </h3>
          <p className='text-2xl font-extralight text-zinc-500'>
            The link might be corrupted
          </p>
          <p className='text-zinc-400'>or The page may have been removed.</p>
        </div>

        <Link className='mx-auto mt-4 font-bold' href='/'>
          Go back home
        </Link>
      </div>
    </div>
  )
}
