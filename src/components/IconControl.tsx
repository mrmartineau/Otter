import { HTMLProps, ReactNode, forwardRef } from 'react';

import './IconControl.css';

export interface IconControlProps extends HTMLProps<HTMLInputElement> {
  children: ReactNode;
  label: string;
  type: 'radio' | 'checkbox' | string;
}

export const IconControl = forwardRef<HTMLInputElement, IconControlProps>(
  ({ label, value, name, type, children, ...props }, forwardedRef) => (
    <label className="icon-control-label">
      <input
        className="icon-control-input"
        type={type}
        value={value}
        name={name}
        ref={forwardedRef}
        {...props}
      />

      <div className="icon-control-tile">
        {children}
        {label ? <div className="icon-control-tile-label">{label}</div> : null}
      </div>
    </label>
  ),
);

IconControl.displayName = 'IconControl';
