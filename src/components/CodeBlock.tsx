import { cn } from '@/src/utils/classnames';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

import './CodeBlock.css';

interface CodeBlockProps extends ComponentPropsWithoutRef<'pre'> {
  children?: ReactNode;
}

export const CodeBlock = ({ className, children, ...rest }: CodeBlockProps) => {
  const CodeBlockClass = cn(className, 'pre');

  return (
    <pre className={CodeBlockClass} {...rest}>
      {children}
    </pre>
  );
};

interface CodeProps extends ComponentPropsWithoutRef<'code'> {
  children?: ReactNode;
}

export const Code = ({ className, children, ...rest }: CodeProps) => {
  const CodeClass = cn(className, 'code');

  return (
    <code className={CodeClass} {...rest}>
      {children}
    </code>
  );
};
