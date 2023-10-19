import { cn } from '@/src/utils/classnames';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import './IconButton.css';

const iconButtonVariants = cva('icon-button-base focus', {
  variants: {
    variant: {
      default: '',
      nav: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      taglist: 'icon-button-taglist',
    },
    size: {
      default: 'h-10 w-10',
      s: 'h-5 w-5',
      m: 'h-6 w-6',
      l: 'h-11 w-11',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  asChild?: boolean;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(iconButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
IconButton.displayName = 'IconButton';

export { IconButton, iconButtonVariants };
