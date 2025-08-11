import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/utils/classnames'

import './Text.css'

const textVariants = cva('box-border', {
  variants: {
    variant: {
      caps: 'uppercase tracking-tight',
      count: 'text-count',
    },
  },
})

export interface TextProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof textVariants> {}

const Text = ({ className, variant, ...props }: TextProps) => {
  return (
    <div
      className={cn(
        textVariants({
          className,
          variant,
        }),
      )}
      {...props}
    />
  )
}
Text.displayName = 'Text'

export { Text, textVariants }
