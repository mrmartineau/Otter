import { ComponentPropsWithRef, forwardRef } from 'react';
import title from 'title';

import { BookmarkType } from '../types/db';
import { IconControl } from './IconControl';
import { TypeToIcon } from './TypeToIcon';

export interface TypeRadioProps extends ComponentPropsWithRef<'input'> {
  value: BookmarkType;
}

export const TypeRadio = forwardRef<HTMLInputElement, TypeRadioProps>(
  ({ value, ...props }, ref) => (
    <IconControl
      type="radio"
      value={value}
      label={title(value)}
      ref={ref}
      {...props}
    >
      <TypeToIcon type={value} className="text-theme8" />
    </IconControl>
  ),
);
