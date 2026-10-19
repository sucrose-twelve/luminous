import { Button } from "@heroui/react"

export function ContentHeader({
  icon,
  title,
  description
}: Readonly<{
  icon: React.ReactNode
  title: string
  description: string
}>) {
  return (
    <div
      className='bg-background sticky inset-x-0 top-0 z-1 px-4 pt-6 sm:px-8 sm:pt-8'
      aria-label='content-header'>
      <div className='flex items-center gap-x-4'>
        {icon}

        <div className='flex grow flex-col select-none'>
          <div className='text-xl font-bold uppercase'>{title}</div>
          <div className='text-xs text-zinc-600'>{description}</div>
        </div>
      </div>
      <div className='mt-4 border-b border-b-zinc-900' />
    </div>
  )
}

export function ContentFooter({
  children,
  onClose
}: Readonly<{ children?: React.ReactNode; onClose?: () => void }>) {
  return (
    <div
      className='bg-background sticky inset-x-0 bottom-0 z-1 px-4 pb-6 sm:px-8 sm:pb-8'
      aria-label='content-footer'>
      <div className='mb-4 border-t border-t-zinc-900' />
      <div className='flex items-center justify-start gap-x-2'>
        {onClose ? (
          <Button
            className='bg-foreground/5 text-foreground/75 rounded-sm'
            type='button'
            variant='secondary'
            onPress={onClose}>
            <span className='uppercase'>close</span>
          </Button>
        ) : null}

        {children}
      </div>
    </div>
  )
}
