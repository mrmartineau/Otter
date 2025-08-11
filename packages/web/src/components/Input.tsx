import type * as React from 'react'
import { cn } from '@/utils/classnames'

import './Input.css'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = ({ className, type, ...props }: InputProps) => {
  return (
    <input
      type={type}
      className={cn(
        'input-base',
        'focus',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  )
}
Input.displayName = 'Input'

export { Input }
