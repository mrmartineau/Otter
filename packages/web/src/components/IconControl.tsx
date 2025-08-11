import type { HTMLProps, ReactNode } from 'react'

import './IconControl.css'

export interface IconControlProps extends HTMLProps<HTMLInputElement> {
  children: ReactNode
  label: string
  type: 'radio' | 'checkbox' | string
}

export const IconControl = ({
  label,
  value,
  name,
  type,
  children,
  ...props
}: IconControlProps) => (
  <label className="icon-control-label">
    <input
      className="icon-control-input"
      type={type}
      value={value}
      name={name}
      {...props}
    />
    <div className="icon-control-tile">
      {children}
      {label ? <div className="icon-control-tile-label">{label}</div> : null}
    </div>
  </label>
)

IconControl.displayName = 'IconControl'
