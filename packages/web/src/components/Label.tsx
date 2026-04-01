import type { ComponentProps } from 'react'
import { cn } from '@/utils/classnames'

const Label = ({ className, ...props }: ComponentProps<'label'>) => (
  <label
    className={cn('zui-label', className)}
    {...props}
  />
)
Label.displayName = 'Label'

export { Label }
