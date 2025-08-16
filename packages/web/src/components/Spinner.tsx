import { SpinnerIcon } from '@phosphor-icons/react'
import { cn } from '@/utils/classnames'

export function Spinner({
  show,
  wait = 'delay-100',
  size = 26,
}: {
  show?: boolean
  wait?: `delay-${number}`
  size?: number
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
      <SpinnerIcon weight="duotone" size={size} />
    </div>
  )
}
