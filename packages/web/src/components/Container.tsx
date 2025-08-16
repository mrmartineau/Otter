import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/utils/classnames'

import './Container.css'

export const containerVariants = cva('otter-container', {
  variants: {
    variant: {
      auth: 'otter-container-auth',
    },
  },
})

interface ContainerProps
  extends ComponentProps<'div'>,
    VariantProps<typeof containerVariants> {
  children?: ReactNode
}

export const Container = ({
  className,
  variant,
  children,
  ...rest
}: ContainerProps) => {
  return (
    <div className={cn(containerVariants({ className, variant }))} {...rest}>
      {children}
    </div>
  )
}
