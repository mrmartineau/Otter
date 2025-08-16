import { Label as LabelPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/utils/classnames'

const Label = ({
  className,
  ...props
}: ComponentProps<typeof LabelPrimitive.Root>) => (
  <LabelPrimitive.Root
    className={cn(
      'flex items-center gap-xs text-step--1 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  />
)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
