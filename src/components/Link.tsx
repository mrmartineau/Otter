import { cn } from '@/src/utils/classnames';
import { type VariantProps, cva } from 'class-variance-authority';
import NextLink from 'next/link';
import * as React from 'react';

import './Link.css';

const linkVariants = cva(['link-base', 'focus'], {
  variants: {
    variant: {
      default: 'link-default',
      accent: 'link-accent',
      subtle: 'link-subtle',
      sidebar: 'link-sidebar',
      logo: 'link-logo',
      add: 'link-add',
      fab: 'link-fab',
      tag: 'link-tag',
      feedTitle: 'link-feed-title',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface LinkProps
  extends React.ComponentPropsWithoutRef<typeof NextLink>,
    VariantProps<typeof linkVariants> {
  isActive?: boolean;
}

const Link = ({ className, variant, isActive, ...props }: LinkProps) => {
  return (
    <NextLink
      className={cn(linkVariants({ variant, className }), {
        'is-active': isActive,
      })}
      {...props}
    />
  );
};
Link.displayName = 'Link';

export { Link, linkVariants };
