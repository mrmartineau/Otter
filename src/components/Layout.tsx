import { ReactNode, ComponentPropsWithoutRef } from 'react'
import { clsx } from 'clsx'
import 'Button.styles.css'

interface ButtonProps extends ComponentPropsWithoutRef<'div'> {
  children?: ReactNode
}

export const Button = ({ className, children, ...rest }: ButtonProps) => {
  const ButtonClass = clsx(className, 'Button')

  return (
    <div className={ButtonClass} {...rest}>
      {children}
    </div>
  )
}
