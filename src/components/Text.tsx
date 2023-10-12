import { cn } from '@/src/utils/classnames';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import './Text.css';

const textVariants = cva('box-border', {
  variants: {
    variant: {
      caps: 'uppercase tracking-tight',
      count: 'text-count',
    },
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof textVariants> {}

const Text = React.forwardRef<HTMLDivElement, TextProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        className={cn(
          textVariants({
            variant,
            className,
          }),
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Text.displayName = 'Text';

export { Text, textVariants as textVariants };
