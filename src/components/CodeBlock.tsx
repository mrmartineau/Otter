import { clsx } from 'clsx';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

import './CodeBlock.styles.css';

interface CodeBlockProps extends ComponentPropsWithoutRef<'pre'> {
  children?: ReactNode;
}

export const CodeBlock = ({ className, children, ...rest }: CodeBlockProps) => {
  const ParagraphClass = clsx(className, 'pre');

  return (
    <pre className={ParagraphClass} {...rest}>
      {children}
    </pre>
  );
};

interface CodeProps extends ComponentPropsWithoutRef<'code'> {
  children?: ReactNode;
}

export const Code = ({ className, children, ...rest }: CodeProps) => {
  const ParagraphClass = clsx(className, 'code');

  return (
    <code className={ParagraphClass} {...rest}>
      {children}
    </code>
  );
};
