import { cn } from '@/src/utils/classnames';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import './Button.css';

const buttonVariants = cva(['button-base', 'focus'], {
  variants: {
    variant: {
      default: 'bg-accent9 text-foreground hover:bg-accent7',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline:
        'text-foreground border border-border bg-background hover:bg-theme4 hover:text-accent-foreground',
      secondary: 'bg-theme8 text-foreground hover:bg-theme6',
      ghost: 'button-ghost',
      collapsible: 'button-collapsible',
      icon: 'h-10 w-10 hover:bg-theme6 hover:text-theme10 button-icon',
      nav: 'text-text hover:bg-theme3 rounded-l flex-shrink-0',
      cmdk: 'button-cmdk',
    },

    size: {
      default: 'h-10 px-m py-s',
      xs: 'h-5 px-2 text-step--2',
      s: 'h-9 px-2xs py-3xs',
      l: 'h-11 px-8',
      collapsible: 'h-6 w-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
