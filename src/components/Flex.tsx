import { cn } from '@/src/utils/classnames';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const flexVariants = cva('', {
  variants: {
    display: {
      flex: 'flex',
      inline: 'inline-flex',
    },
    direction: {
      row: 'flex-row',
      column: 'flex-col',
      rowReverse: 'flex-row-reverse',
      columnReverse: 'flex-col-reverse',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
    wrap: {
      noWrap: 'flex-nowrap',
      wrap: 'flex-wrap',
      wrapReverse: 'flex-wrap-reverse',
    },
    gap: {
      '4xs': 'gap-4xs',
      '3xs': 'gap-3xs',
      '2xs': 'gap-2xs',
      xs: 'gap-xs',
      s: 'gap-s',
      m: 'gap-m',
      l: 'gap-l',
      xl: 'gap-xl',
      '2xl': 'gap-2xl',
      '3xl': 'gap-3xl',
    },
    gapX: {
      '4xs': 'gap-x-4xs',
      '3xs': 'gap-x-3xs',
      '2xs': 'gap-x-2xs',
      xs: 'gap-x-xs',
      s: 'gap-x-s',
      m: 'gap-x-m',
      l: 'gap-x-l',
      xl: 'gap-x-xl',
      '2xl': 'gap-x-2xl',
      '3xl': 'gap-x-3xl',
    },
    gapY: {
      '4xs': 'gap-y-4xs',
      '3xs': 'gap-y-3xs',
      '2xs': 'gap-y-2xs',
      xs: 'gap-y-xs',
      s: 'gap-y-s',
      m: 'gap-y-m',
      l: 'gap-y-l',
      xl: 'gap-y-xl',
      '2xl': 'gap-y-2xl',
      '3xl': 'gap-y-3xl',
    },
  },
  defaultVariants: {
    display: 'flex',
  },
});

export interface FlexProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      className,
      display,
      direction,
      align,
      justify,
      wrap,
      gap,
      gapX,
      gapY,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        className={cn(
          flexVariants({
            display,
            direction,
            align,
            justify,
            wrap,
            gap,
            gapX,
            gapY,
            className,
          }),
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Flex.displayName = 'Flex';

export { Flex, flexVariants };
