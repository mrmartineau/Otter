import { Link as TanstackLink } from '@tanstack/react-router'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/utils/classnames'

const linkVariants = cva([], {
  defaultVariants: {
    variant: 'default',
  },
  variants: {
    variant: {
      accent: 'zui-link link-accent',
      add: 'link-base link-add',
      default: 'zui-link',
      fab: 'link-base link-fab',
      feedTitle: 'link-base link-feed-title',
      logo: 'link-base link-logo',
      sidebar: 'link-base link-sidebar',
      subtle: 'link-base link-subtle',
      tag: 'link-base link-tag',
    },
  },
})

export interface LinkProps
  extends React.ComponentProps<typeof TanstackLink>,
    VariantProps<typeof linkVariants> {
  isActive?: boolean
}

const Link = ({ className, variant, isActive, href, ...props }: LinkProps) => {
  return (
    <TanstackLink
      className={cn(linkVariants({ variant }), className, {
        'is-active': isActive,
      })}
      to={href}
      {...props}
    />
  )
}
Link.displayName = 'Link'

export { Link, linkVariants }
