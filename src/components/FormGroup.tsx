import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import clsx from 'clsx';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

import { Text } from './Text';

export interface FormGroupProps extends ComponentPropsWithoutRef<'div'> {
  label: string;
  name: string;
  note?: string;
  children: ReactNode;
  labelIsVisible?: boolean;

  error?: string;
}

export const FormGroup = ({
  label,
  name,
  note,
  labelIsVisible = true,
  error,
  children,
  className,
  ...rest
}: FormGroupProps): JSX.Element => {
  const formGroupClass = cn('form-group', className);
  const labelClass = clsx({ 'mb-2': true, hidden: !labelIsVisible });
  return (
    <div className={formGroupClass} {...rest}>
      <Label htmlFor={name} className={labelClass}>
        {label}
      </Label>
      {children}
      {note ? <Text>{note}</Text> : null}
      {error ? <Text>{note}</Text> : null}
    </div>
  );
};
