import { Label } from '@/src/components/Label';
import { cn } from '@/src/utils/classnames';
import clsx from 'clsx';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

import { Text } from './Text';

export interface FormGroupProps extends ComponentPropsWithoutRef<'div'> {
  label: string;
  name: string;
  note?: string;
  labelSuffix?: ReactNode;
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
  labelSuffix,
  ...rest
}: FormGroupProps): JSX.Element => {
  const formGroupClass = cn('form-group', className);
  const labelClass = clsx({ 'mb-2': true, hidden: !labelIsVisible });
  return (
    <div className={formGroupClass} {...rest}>
      <Label htmlFor={name} className={labelClass}>
        {label} {labelSuffix}
      </Label>
      {children}
      {note ? <Text>{note}</Text> : null}
      {error ? <Text>{note}</Text> : null}
    </div>
  );
};
