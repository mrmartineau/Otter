import { cva, type VariantProps } from 'class-variance-authority'
import { Slot as SlotPrimitive } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/utils/classnames'

const buttonVariants = cva(['button-base', 'focus'], {
  defaultVariants: {
    size: 'm',
    variant: 'default',
  },
  variants: {
    size: {
      '2xs': 'px-3xs py-4xs text-step--2',
      collapsible: 'h-6 w-6',
      l: 'px-m py-s',
      m: 'px-l py-2xs text-step-0',
      s: 'px-s py-2xs',
      xs: 'px-xs py-3xs text-step--2',
    },
    variant: {
      cmdk: 'button-cmdk',
      collapsible: 'button-collapsible',
      default: 'bg-accent9 hover:bg-accent7',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      ghost: 'button-ghost',
      icon: 'h-10 w-10 hover:bg-theme6 hover:text-theme10 button-icon',
      nav: 'text-text hover:bg-theme3 rounded-lg shrink-0',
      outline: 'button-outline',
      secondary: 'bg-theme8 hover:bg-theme6',
    },
  },
})

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) => {
  const Comp = asChild ? SlotPrimitive.Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  )
}
Button.displayName = 'Button'

export { Button, buttonVariants }
