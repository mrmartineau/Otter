import { Link as TanstackLink } from '@tanstack/react-router'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/utils/classnames'

const linkVariants = cva(['link-base', 'focus'], {
  defaultVariants: {
    variant: 'default',
  },
  variants: {
    variant: {
      accent: 'link-accent',
      add: 'link-add',
      default: 'link-default',
      fab: 'link-fab',
      feedTitle: 'link-feed-title',
      logo: 'link-logo',
      sidebar: 'link-sidebar',
      subtle: 'link-subtle',
      tag: 'link-tag',
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
      className={cn(linkVariants({ className, variant }), {
        'is-active': isActive,
      })}
      to={href}
      {...props}
    />
  )
}
Link.displayName = 'Link'

export { Link, linkVariants }
