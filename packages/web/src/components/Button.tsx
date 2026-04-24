import { cva, type VariantProps } from 'class-variance-authority'
import { Slot as SlotPrimitive } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/utils/classnames'

const buttonVariants = cva(['zui-button'], {
  defaultVariants: {
    size: 'm',
    variant: 'default',
  },
  variants: {
    size: {
      // @biome-ignore assist/source/useSortedKeys
      '2xs': 'zui-button-size-xs',
      collapsible: 'h-6 w-6',
      l: 'zui-button-size-lg',
      m: '',
      s: 'zui-button-size-sm',
      xs: 'zui-button-size-xs',
    },
    variant: {
      collapsible: 'button-collapsible',
      default: '',
      destructive: 'zui-button-color-destructive',
      ghost: 'zui-button-variant-ghost',
      icon: 'zui-button-icon',
      nav: 'zui-button-variant-ghost rounded-lg shrink-0',
      outline: 'zui-button-variant-outline',
      secondary: 'zui-button-variant-subtle',
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
      className={cn(buttonVariants({ size, variant }), className)}
      {...props}
    />
  )
}
Button.displayName = 'Button'

export { Button, buttonVariants }
