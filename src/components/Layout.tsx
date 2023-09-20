import 'Button.styles.css';
import { clsx } from 'clsx';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

interface ButtonProps extends ComponentPropsWithoutRef<'div'> {
  children?: ReactNode;
}

export const Button = ({ className, children, ...rest }: ButtonProps) => {
  const ButtonClass = clsx(className, 'Button');

  return (
    <div className={ButtonClass} {...rest}>
      {children}
    </div>
  );
};
