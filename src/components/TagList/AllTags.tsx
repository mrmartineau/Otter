import { Button } from '@/src/components/Button';
import { CONTENT } from '@/src/constants';
import { MetaTag } from '@/src/utils/fetching/meta';
import { useEffect, useState } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../Collapsible';
import { Flex } from '../Flex';
import { Text } from '../Text';
import { useUser } from '../UserProvider';
import { TagListItem } from './TagListItem';

interface AllTagsProps {
  tags?: MetaTag[];
}

export const AllTags = ({ tags }: AllTagsProps) => {
  const { profile, handleUpdateUISettings } = useUser();
  const [theTags, setTheTags] = useState<MetaTag[] | undefined>(tags);
  const topTagsLimit = profile?.settings_top_tags_count;

  const pinnedTags = tags
    ?.filter(({ tag }) => {
      return (
        tag &&
        profile?.settings_pinned_tags !== null &&
        profile?.settings_pinned_tags.indexOf(tag) !== -1
      );
    })
    .sort((one, two) => two.count! - one.count!);

  const handleViewTopNTags = (limit: number | null) => {
    handleUpdateUISettings({
      type: 'settings_top_tags_count',
      payload: limit,
    });
  };

  useEffect(() => {
    const topTags = (tags: MetaTag[], limit: number): MetaTag[] => {
      return tags.slice(0, limit);
    };
    if (topTagsLimit !== null) {
      setTheTags(topTags(tags as MetaTag[], topTagsLimit as number));
    } else {
      setTheTags(tags);
    }
  }, [tags, topTagsLimit]);

  if (!tags?.length) {
    return null;
  }

  return (
    <Collapsible stateKey="tags">
      <CollapsibleTrigger asChild>
        {CONTENT.tagsNav} <Text variant="count">{tags?.length}</Text>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {tags.length > 20 ? (
          <Flex gapX="2xs" className="mb-3xs" justify="center">
            <Button
              variant="ghost"
              size="xs"
              aria-pressed={topTagsLimit === 5}
              onClick={() => handleViewTopNTags(5)}
            >
              5
            </Button>
            <Button
              variant="ghost"
              size="xs"
              aria-pressed={topTagsLimit === 10}
              onClick={() => handleViewTopNTags(10)}
            >
              10
            </Button>
            <Button
              variant="ghost"
              size="xs"
              aria-pressed={topTagsLimit === 20}
              onClick={() => handleViewTopNTags(20)}
            >
              20
            </Button>
            <Button
              variant="ghost"
              size="xs"
              aria-pressed={topTagsLimit === null}
              onClick={() => handleViewTopNTags(null)}
            >
              All
            </Button>
          </Flex>
        ) : null}

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
              if (
                tag &&
                profile?.settings_pinned_tags !== null &&
                profile?.settings_pinned_tags.indexOf(tag) === -1
              ) {
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
