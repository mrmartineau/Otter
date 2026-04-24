import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/utils/classnames'

interface CodeBlockProps extends ComponentProps<'pre'> {
  children?: ReactNode
}

export const CodeBlock = ({ className, children, ...rest }: CodeBlockProps) => {
  return (
    <pre className={cn('zui-pre', className)} {...rest}>
      {children}
    </pre>
  )
}

interface CodeProps extends ComponentProps<'code'> {
  children?: ReactNode
}

export const Code = ({ className, children, ...rest }: CodeProps) => {
  return (
    <code className={cn('zui-code', className)} {...rest}>
      {children}
    </code>
  )
}
