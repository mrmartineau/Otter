import { Label as LabelPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/utils/classnames'

const Label = ({
  className,
  ...props
}: ComponentProps<typeof LabelPrimitive.Root>) => (
  <LabelPrimitive.Root
    className={`${cn(
      'flex items-center gap-xs ml-1 tracking-wide uppercase font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-step--2',
      className,
    )} text-theme8`}
    {...props}
  />
)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
