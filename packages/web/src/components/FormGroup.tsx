import clsx from 'clsx'
import type { ComponentProps, JSX, ReactNode } from 'react'
import { Label } from '@/components/Label'
import { cn } from '@/utils/classnames'

import { Text } from './Text'

export interface FormGroupProps extends ComponentProps<'div'> {
  label: string
  name: string
  note?: string
  labelSuffix?: ReactNode
  children: ReactNode
  labelIsVisible?: boolean

  error?: string
}

export const FormGroup = ({
  label,
  name,
  note,
  labelIsVisible = true,
  error,
  children,
  className,
  labelSuffix,
  ...rest
}: FormGroupProps): JSX.Element => {
  const formGroupClass = cn('form-group', className)
  const labelClass = clsx({ hidden: !labelIsVisible, 'mb-2': true })
  return (
    <div className={formGroupClass} {...rest}>
      <Label htmlFor={name} className={labelClass}>
        {label} {labelSuffix}
      </Label>
      {children}
      {note ? <Text>{note}</Text> : null}
      {error ? <Text>{note}</Text> : null}
    </div>
  )
}
