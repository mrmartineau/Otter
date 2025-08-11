import { cva } from 'class-variance-authority'

import './Heading.css'

export const headingVariants = cva('heading', {
  defaultVariants: {
    variant: 'h1',
  },
  variants: {
    variant: {
      date: 'heading-date',
      feedTitle: 'heading-feed-title',
      h1: 'heading-1',
    },
  },
})
