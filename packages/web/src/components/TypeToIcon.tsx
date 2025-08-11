import {
  BarbellIcon,
  CalendarXIcon,
  FilesIcon,
  GameControllerIcon,
  HamburgerIcon,
  HeadphonesIcon,
  type IconProps,
  ImageSquareIcon,
  LinkSimpleHorizontalIcon,
  MapPinIcon,
  NewspaperClippingIcon,
  NotepadIcon,
  VideoCameraIcon,
} from '@phosphor-icons/react'

import type { BookmarkType } from '../types/db'

export interface TypeToIconProps extends IconProps {
  type: BookmarkType
}
export const TypeToIcon = ({ type, color, ...rest }: TypeToIconProps) => {
  switch (type) {
    case 'article':
      return (
        <NewspaperClippingIcon
          aria-label="Article"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    case 'video':
      return (
        <VideoCameraIcon
          aria-label="Video"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    case 'audio':
      return (
        <HeadphonesIcon
          aria-label="Video"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    case 'image':
      return (
        <ImageSquareIcon
          aria-label="Video"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    case 'recipe':
      return (
        <HamburgerIcon
          aria-label="Recipe"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    case 'document':
      return (
        <FilesIcon
          aria-label="Document"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    case 'product':
      return (
        <BarbellIcon
          aria-label="Product"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    case 'game':
      return (
        <GameControllerIcon
          aria-label="Game"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    case 'link':
      return (
        <LinkSimpleHorizontalIcon
          aria-label="Link"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    case 'note':
      return (
        <NotepadIcon
          aria-label="Note"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    case 'event':
      return (
        <CalendarXIcon
          aria-label="Product"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    case 'place':
      return (
        <MapPinIcon
          aria-label="Place"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      )
    default:
      return null
  }
}
