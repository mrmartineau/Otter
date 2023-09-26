import { useUpdateUISettings } from '@/src/hooks/useUpdateUISettings';
import { MetaTag } from '@/src/utils/fetching/meta';

import { Flex } from '../Flex';
import { TagListItem } from './TagListItem';

interface PinnedTagsProps {
  allTags?: MetaTag[];
}

export const PinnedTags = ({ allTags }: PinnedTagsProps) => {
  const [settings] = useUpdateUISettings();
  const pinnedTags = allTags
    ?.filter(({ tag }) => {
      return tag && settings.uiState.pinnedTags.indexOf(tag) !== -1;
    })
    .sort((one, two) => two.count! - one.count!);

  return (
    <Flex gapY="2xs" direction="column">
      {pinnedTags?.length ? (
        <div className="mb-2xs">
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
  );
};
