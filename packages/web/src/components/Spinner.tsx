import { SpinnerIcon } from '@phosphor-icons/react'
import { cn } from '@/utils/classnames'

export function Spinner({
  show,
  wait = 'delay-100',
}: {
  show?: boolean
  wait?: `delay-${number}`
}) {
  return (
    <div
      className={cn(
        `inline-block px-3 transition`,
        {
          'opacity-0': !show,
          'opacity-100 animate-spin duration-1000': show,
        },
        wait
      )}
    >
      <SpinnerIcon weight="duotone" size={26} />
    </div>
  )
}
