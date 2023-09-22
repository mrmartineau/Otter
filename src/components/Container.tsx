import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

import './Container.styles.css';

export const containerVariants = cva('container', {
  variants: {
    variant: {
      auth: 'px-m max-w-[400px]',
    },
  },
});

interface ContainerProps extends ComponentPropsWithoutRef<'div'> {
  children?: ReactNode;
}

export const Container = ({ className, children, ...rest }: ContainerProps) => {
  const ParagraphClass = clsx(className, 'container');

  return (
    <div className={ParagraphClass} {...rest}>
      {children}
    </div>
  );
};
