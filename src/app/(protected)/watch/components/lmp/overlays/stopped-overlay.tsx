import Image from "next/image"

/**
 * The episode's poster over the video after Stop. The Play button in the middle of the player, drawn above
 * it, starts the episode again.
 */
export function StoppedOverlay({ episodeId }: Readonly<{ episodeId: string }>) {
  return (
    <div className='pointer-events-none absolute inset-0'>
      <Image
        src={`/api/art/thumbnail/${episodeId}`}
        alt=''
        fill
        sizes='100vw'
        className='bg-black object-contain'
      />
    </div>
  )
}
