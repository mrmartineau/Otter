import { clsx } from 'clsx';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

import './Paragraph.styles.css';

interface ParagraphProps extends ComponentPropsWithoutRef<'p'> {
  children?: ReactNode;
}

export const Paragraph = ({ className, children, ...rest }: ParagraphProps) => {
  const ParagraphClass = clsx(className, 'paragraph');

  return (
    <p className={ParagraphClass} {...rest}>
      {children}
    </p>
  );
};
