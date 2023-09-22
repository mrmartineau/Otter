import {
  Barbell,
  CalendarX,
  Files,
  GameController,
  Hamburger,
  Headphones,
  type IconProps,
  ImageSquare,
  LinkSimpleHorizontal,
  NewspaperClipping,
  Notepad,
  VideoCamera,
} from '@phosphor-icons/react';

import { BookmarkType } from '../types/db';

export interface TypeToIconProps extends IconProps {
  type: BookmarkType;
}
export const TypeToIcon = ({ type, color, ...rest }: TypeToIconProps) => {
  switch (type) {
    case 'article':
      return (
        <NewspaperClipping
          aria-label="Article"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      );
    case 'video':
      return (
        <VideoCamera
          aria-label="Video"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      );
    case 'audio':
      return (
        <Headphones
          aria-label="Video"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      );
    case 'image':
      return (
        <ImageSquare
          aria-label="Video"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      );
    case 'recipe':
      return (
        <Hamburger
          aria-label="Recipe"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      );
    case 'document':
      return (
        <Files
          aria-label="Document"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      );
    case 'product':
      return (
        <Barbell
          aria-label="Product"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      );
    case 'game':
      return (
        <GameController
          aria-label="Game"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      );
    case 'link':
      return (
        <LinkSimpleHorizontal
          aria-label="Link"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      );
    case 'note':
      return (
        <Notepad
          aria-label="Note"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      );
    case 'event':
      return (
        <CalendarX
          aria-label="Product"
          weight="duotone"
          size={18}
          color={color}
          {...rest}
        />
      );
    default:
      return null;
  }
};
