import { Button } from '@/components/ui/button';
import { CONTENT } from '@/src/constants';
import {
  UseUpdateReturn,
  useUpdateUISettings,
} from '@/src/hooks/useUpdateUISettings';
import { MetaTag } from '@/src/utils/fetching/meta';
import { useEffect, useState } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../Collapsible';
import { Flex } from '../Flex';
import { Text } from '../Text';
import { TagListItem } from './TagListItem';

interface AllTagsProps {
  tags?: MetaTag[];
  // settings: UseUpdateReturn[0];
  // handleUpdateUISettings: UseUpdateReturn[1];
}

export const AllTags = ({ tags }: AllTagsProps) => {
  const [settings, handleUpdateUISettings] = useUpdateUISettings();
  const [theTags, setTheTags] = useState<MetaTag[] | undefined>(tags);
  const isViewingTopTags = settings.uiState.topTags;
  console.log(
    `🚀 ~ settings.uiState:`,
    JSON.stringify(settings.uiState, null, 2),
  );
  const topTagsLimit = settings.uiState.topTagsLimit;
  const pinnedTagss = settings.uiState.pinnedTags;

  const pinnedTags = tags
    ?.filter(({ tag }) => {
      return tag && settings.uiState.pinnedTags.indexOf(tag) !== -1;
    })
    .sort((one, two) => two.count! - one.count!);

  const handleViewTopNTags = (viewTopTags: boolean, limit = 0) => {
    handleUpdateUISettings({
      type: 'topTags',
      payload: { active: viewTopTags, limit },
    });
  };

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
        {CONTENT.tagsNav} <Text variant="count">{tags?.length}</Text>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Flex gapX="2xs" className="mb-3xs" justify="center">
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

        {/* Pinned tags */}
        <Flex gapY="2xs" direction="column">
          {pinnedTags?.length ? (
            <div className="mb-3xs">
              {pinnedTags.map(({ tag, count }) => (
                <TagListItem
                  tag={tag}
                  count={count}
                  key={`pinned-tag-${tag}`}
                  pinned={true}
                />
              ))}
            </div>
          ) : null}
        </Flex>

        {/* All other tags */}
        <Flex gapY="3xs" direction="column">
          {theTags?.length ? (
            theTags.map(({ tag, count }) => {
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
          ) : (
            <div className="text-center text-step--2">No tags</div>
          )}
        </Flex>
      </CollapsibleContent>
    </Collapsible>
  );
};
