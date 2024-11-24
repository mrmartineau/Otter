import type { BaseBookmark, Bookmark, BookmarkType } from '@/src/types/db';
import { simpleUrl } from '@/src/utils/simpleUrl';
import { ArrowSquareOut, Calendar, Hash } from '@phosphor-icons/react';
import tinyRelativeDate from 'tiny-relative-date';
import formatTitle from 'title';

import { Favicon } from '../Favicon';
import { TypeToIcon } from '../TypeToIcon';
import { type AccessoryModel, Item } from './Item';

const listFormat = new Intl.ListFormat('en', {
  style: 'long',
  type: 'conjunction',
});

type BookmarkSearchItemProps = {
  isHoldingAltKeyDown: boolean;
} & Pick<
  BaseBookmark,
  | 'id'
  | 'title'
  | 'description'
  | 'note'
  | 'url'
  | 'type'
  | 'tags'
  | 'created_at'
>;

export const BookmarkSearchItem = ({
  id,
  title,
  description,
  note,
  url,
  type,
  tags,
  created_at,
  isHoldingAltKeyDown,
}: BookmarkSearchItemProps) => {
  let titleReplacement = title;
  if (!title) {
    titleReplacement = description || note;
  }
  const accessories: AccessoryModel[] = [];
  if (url) {
    accessories.push({
      text: simpleUrl(url),
      tooltip: url,
    });
  }
  if (type) {
    accessories.push({
      Icon: <TypeToIcon type={type} />,
      tooltip: formatTitle(type),
      showOnMobile: true,
    });
  }
  if (tags?.length) {
    accessories.push({
      Icon: <Hash weight="duotone" aria-label="Tag" />,
      tooltip: `Tags: ${listFormat.format(tags)}`,
    });
  }
  if (note) {
    accessories.push({
      Icon: <TypeToIcon type="note" />,
      tooltip: note,
    });
  }
  accessories.push({
    Icon: <Calendar weight="duotone" aria-label="Date" />,
    tooltip: `Added: ${tinyRelativeDate(new Date(created_at))}`,
  });

  if (isHoldingAltKeyDown) {
    accessories.unshift({
      Icon: <ArrowSquareOut aria-label="Go" className="actionIcon" />,
    });
  }

  const tagsList = tags?.length ? tags.join(' ') : '';
  const urlHostname = url ? simpleUrl(url) : '';
  const value = [
    title,
    description?.slice(0, 60),
    note?.slice(0, 60),
    urlHostname,
    tagsList,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Item
      value={value}
      to={isHoldingAltKeyDown && url ? url : `/bookmark/${id}`}
      url={url}
      accessories={accessories}
      image={url ? <Favicon url={url} /> : null}
    >
      {titleReplacement}
    </Item>
  );
};
