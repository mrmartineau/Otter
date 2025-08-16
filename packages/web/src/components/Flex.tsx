import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/utils/classnames'

const flexVariants = cva('', {
  defaultVariants: {
    display: 'flex',
  },
  variants: {
    align: {
      baseline: 'items-baseline',
      center: 'items-center',
      end: 'items-end',
      start: 'items-start',
      stretch: 'items-stretch',
    },
    direction: {
      column: 'flex-col',
      columnReverse: 'flex-col-reverse',
      row: 'flex-row',
      rowReverse: 'flex-row-reverse',
    },
    display: {
      flex: 'flex',
      inline: 'inline-flex',
    },
    gap: {
      '2xl': 'gap-2xl',
      '2xs': 'gap-2xs',
      '3xl': 'gap-3xl',
      '3xs': 'gap-3xs',
      '4xs': 'gap-4xs',
      l: 'gap-l',
      m: 'gap-m',
      s: 'gap-s',
      xl: 'gap-xl',
      xs: 'gap-xs',
    },
    gapX: {
      '2xl': 'gap-x-2xl',
      '2xs': 'gap-x-2xs',
      '3xl': 'gap-x-3xl',
      '3xs': 'gap-x-3xs',
      '4xs': 'gap-x-4xs',
      l: 'gap-x-l',
      m: 'gap-x-m',
      s: 'gap-x-s',
      xl: 'gap-x-xl',
      xs: 'gap-x-xs',
    },
    gapY: {
      '2xl': 'gap-y-2xl',
      '2xs': 'gap-y-2xs',
      '3xl': 'gap-y-3xl',
      '3xs': 'gap-y-3xs',
      '4xs': 'gap-y-4xs',
      l: 'gap-y-l',
      m: 'gap-y-m',
      s: 'gap-y-s',
      xl: 'gap-y-xl',
      xs: 'gap-y-xs',
    },
    justify: {
      between: 'justify-between',
      center: 'justify-center',
      end: 'justify-end',
      start: 'justify-start',
    },
    wrap: {
      noWrap: 'flex-nowrap',
      wrap: 'flex-wrap',
      wrapReverse: 'flex-wrap-reverse',
    },
  },
})

export interface FlexProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {}

const Flex = ({
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
}: FlexProps) => {
  return (
    <div
      className={cn(
        flexVariants({
          align,
          className,
          direction,
          display,
          gap,
          gapX,
          gapY,
          justify,
          wrap,
        }),
      )}
      {...props}
    />
  )
}
Flex.displayName = 'Flex'

export { Flex, flexVariants }
