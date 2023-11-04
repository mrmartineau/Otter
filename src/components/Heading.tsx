import { cva } from 'class-variance-authority';

import './Heading.css';

export const headingVariants = cva('heading', {
  variants: {
    variant: {
      h1: 'heading-1',
      date: 'heading-date',
      feedTitle: 'heading-feed-title',
    },
  },
  defaultVariants: {
    variant: 'h1',
  },
});
