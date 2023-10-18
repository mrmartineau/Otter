import { cn } from '@/src/utils/classnames';
import { VariantProps, cva } from 'class-variance-authority';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

import './Container.css';

export const containerVariants = cva('otter-container', {
  variants: {
    variant: {
      auth: 'otter-container-auth',
    },
  },
});

interface ContainerProps
  extends ComponentPropsWithoutRef<'div'>,
    VariantProps<typeof containerVariants> {
  children?: ReactNode;
}

export const Container = ({
  className,
  variant,
  children,
  ...rest
}: ContainerProps) => {
  return (
    <div className={cn(containerVariants({ variant, className }))} {...rest}>
      {children}
    </div>
  );
};
