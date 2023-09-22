import { cva } from 'class-variance-authority';

import './Heading.styles.css';

export const headingVariants = cva('heading', {
  variants: {
    variant: {
      h1: 'text-step-7 mt-space-l',
      date: 'text-step--2 font-normal my-space-2xs uppercase text-theme10',
      sidebarSection:
        'text-step--1 font-medium px-space-3xs py-space-xs text-theme10 my-0',
      sidebar: 'link-sidebar',
      logo: 'link-logo',
      add: 'link-add',
      feedTitle: 'link-feed-title',
    },
  },
  defaultVariants: {
    variant: 'h1',
  },
});
