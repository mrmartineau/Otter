import type { ComponentPropsWithRef } from 'react'
import title from 'title'

import type { BookmarkType } from '../types/db'
import { TypeToIcon } from './TypeToIcon'

export interface TypeRadioProps extends ComponentPropsWithRef<'input'> {
  value: BookmarkType
}

export const TypeRadio = ({ value, ...props }: TypeRadioProps) => (
  <label className="type-radio">
    <input
      className="type-radio-input"
      type="radio"
      value={value}
      name={value}
      {...props}
    />

    <div className="type-radio-label">
      <TypeToIcon type={value} />
      {title(value)}
    </div>
  </label>
)

TypeRadio.displayName = 'TypeRadio'
