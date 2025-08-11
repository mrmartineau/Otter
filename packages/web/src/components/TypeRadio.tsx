import type { ComponentPropsWithRef } from 'react'
import title from 'title'

import type { BookmarkType } from '../types/db'
import { IconControl } from './IconControl'
import { TypeToIcon } from './TypeToIcon'

export interface TypeRadioProps extends ComponentPropsWithRef<'input'> {
  value: BookmarkType
}

export const TypeRadio = ({ value, ...props }: TypeRadioProps) => (
  <IconControl type="radio" value={value} label={title(value)} {...props}>
    <TypeToIcon type={value} className="text-theme8" />
  </IconControl>
)

TypeRadio.displayName = 'TypeRadio'
