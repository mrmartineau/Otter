import { clsx } from 'clsx';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

import './CodeBlock.styles.css';

interface CodeBlockProps extends ComponentPropsWithoutRef<'pre'> {
  children?: ReactNode;
}

export const CodeBlock = ({ className, children, ...rest }: CodeBlockProps) => {
  const CodeBlockClass = clsx(className, 'pre');

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
  const CodeClass = clsx(className, 'code');

  return (
    <code className={CodeClass} {...rest}>
      {children}
    </code>
  );
};
