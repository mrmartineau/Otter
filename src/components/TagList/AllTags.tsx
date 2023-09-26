import { Button } from '@/components/ui/button';
import { CONTENT } from '@/src/constants';
import { useUpdateUISettings } from '@/src/hooks/useUpdateUISettings';
import { MetaTag } from '@/src/utils/fetching/meta';
import { CaretUpDown } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../Collapsible';
import { Flex } from '../Flex';
import { Text } from '../Text';
import { PinnedTags } from './PinnedTags';
import { TagListItem } from './TagListItem';

interface AllTagsProps {
  tags?: MetaTag[];
}

export const AllTags = ({ tags }: AllTagsProps) => {
  const [settings, handleUpdateUISettings] = useUpdateUISettings();
  const isViewingTopTags = settings.uiState.topTags;
  const topTagsLimit = settings.uiState.topTagsLimit;
  const handleViewTopNTags = (viewTopTags: boolean, limit = 0) => {
    handleUpdateUISettings({
      type: 'topTags',
      payload: { active: viewTopTags, limit },
    });
  };
  const [theTags, setTheTags] = useState<MetaTag[] | undefined>([]);
  useEffect(() => {
    const topTags = (tags: MetaTag[], limit: number): MetaTag[] => {
      return tags
        ?.filter((tag) => tag.count !== null && tag.count > 5)
        .slice(0, limit);
    };
    if (isViewingTopTags) {
      setTheTags(topTags(tags as MetaTag[], topTagsLimit));
    } else {
      setTheTags(tags);
    }
  }, [isViewingTopTags, tags, topTagsLimit]);

  if (!tags?.length) {
    return null;
  }

  return (
    <Collapsible stateKey="tags">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="justify-between w-full gap-xs">
          <Flex justify="between" align="center" className="grow">
            {CONTENT.tagsNav} <Text variant="count">{tags?.length}</Text>
          </Flex>
          <CaretUpDown weight="duotone" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Flex gapX="2xs" className="pr-2xs mb-3xs" justify="end">
          {tags.length > 5 ? (
            <Button
              variant="ghost"
              size="tiny"
              aria-pressed={isViewingTopTags && topTagsLimit === 5}
              onClick={() => handleViewTopNTags(true, 5)}
            >
              5
            </Button>
          ) : null}
          {tags.length > 10 ? (
            <Button
              variant="ghost"
              size="tiny"
              aria-pressed={isViewingTopTags && topTagsLimit === 10}
              onClick={() => handleViewTopNTags(true, 10)}
            >
              10
            </Button>
          ) : null}
          {tags.length > 20 ? (
            <Button
              variant="ghost"
              size="tiny"
              aria-pressed={isViewingTopTags && topTagsLimit === 20}
              onClick={() => handleViewTopNTags(true, 20)}
            >
              20
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="tiny"
            aria-pressed={!isViewingTopTags}
            onClick={() => handleViewTopNTags(false)}
          >
            All
          </Button>
        </Flex>

        <PinnedTags allTags={tags} />

        <Flex gapY="3xs" direction="column">
          {theTags?.length
            ? theTags.map(({ tag, count }) => {
                if (tag && settings.uiState.pinnedTags.indexOf(tag) === -1) {
                  return (
                    <TagListItem
                      tag={tag}
                      count={count}
                      key={tag}
                      pinned={false}
                    />
                  );
                }
                return null;
              })
            : 'No tags'}
        </Flex>
      </CollapsibleContent>
    </Collapsible>
  );
};
