import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/utils/classnames'

import './Paragraph.css'

interface ParagraphProps extends ComponentProps<'p'> {
  children?: ReactNode
}

export const Paragraph = ({ className, children, ...rest }: ParagraphProps) => {
  const ParagraphClass = cn(className, 'paragraph')

  return (
    <p className={ParagraphClass} {...rest}>
      {children}
    </p>
  )
}
