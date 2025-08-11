import { cva, type VariantProps } from 'class-variance-authority'
import { Slot as SlotPrimitive } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/utils/classnames'

import './IconButton.css'

const iconButtonVariants = cva('icon-button-base focus', {
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
  variants: {
    size: {
      default: 'h-10 w-10',
      l: 'h-11 w-11',
      m: 'h-6 w-6',
      s: 'h-5 w-5',
    },
    variant: {
      default: '',
      nav: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      taglist: 'icon-button-taglist',
    },
  },
})

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  asChild?: boolean
}

const IconButton = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: IconButtonProps) => {
  const Comp = asChild ? SlotPrimitive.Slot : 'button'
  return (
    <Comp
      className={cn(iconButtonVariants({ className, size, variant }))}
      {...props}
    />
  )
}
IconButton.displayName = 'IconButton'

export { IconButton, iconButtonVariants }
