import { cn } from '@/src/utils/classnames';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import './Button.css';

const buttonVariants = cva(
  'inline-flex items-center gap-xs justify-center rounded-m text-s font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-theme10 text-theme3 hover:bg-theme9',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'button-ghost',
        collapsible:
          'hover:bg-theme6 hover:text-theme10 px-2xs py-3xs font-normal',
        link: 'text-primary underline-offset-4 hover:underline',
        icon: 'h-10 w-10 hover:bg-theme6 hover:text-theme10 button-icon',
        nav: 'text-text hover:bg-theme3 rounded-l flex-shrink-0',
        cmdk: 'button-cmdk',
      },

      size: {
        default: 'h-10 px-4 py-2',
        xs: 'h-5 rounded-s px-2 text-step--2',
        s: 'h-9 rounded-m px-2xs py-3xs',
        l: 'h-11 rounded-m px-8',
        collapsible: 'h-6 w-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

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
