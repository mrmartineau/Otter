import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/utils/classnames'

import './CodeBlock.css'

interface CodeBlockProps extends ComponentProps<'pre'> {
  children?: ReactNode
}

export const CodeBlock = ({ className, children, ...rest }: CodeBlockProps) => {
  const CodeBlockClass = cn(className, 'pre')

  return (
    <pre className={CodeBlockClass} {...rest}>
      {children}
    </pre>
  )
}

interface CodeProps extends ComponentProps<'code'> {
  children?: ReactNode
}

export const Code = ({ className, children, ...rest }: CodeProps) => {
  const CodeClass = cn(className, 'code')

  return (
    <code className={CodeClass} {...rest}>
      {children}
    </code>
  )
}
