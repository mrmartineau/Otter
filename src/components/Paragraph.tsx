import { cn } from '@/src/utils/classnames';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

import './Paragraph.css';

interface ParagraphProps extends ComponentPropsWithoutRef<'p'> {
  children?: ReactNode;
}

export const Paragraph = ({ className, children, ...rest }: ParagraphProps) => {
  const ParagraphClass = cn(className, 'paragraph');

  return (
    <p className={ParagraphClass} {...rest}>
      {children}
    </p>
  );
};
