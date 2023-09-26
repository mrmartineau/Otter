import { Button } from '@/components/ui/button';
import { useUpdateUISettings } from '@/src/hooks/useUpdateUISettings';
import { MetaTag } from '@/src/utils/fetching/meta';
import { CheckCircle, Hash, XCircle } from '@phosphor-icons/react';

import { SidebarLink } from '../SidebarLink';
import './TagList.styles.css';

interface PinUnpinTagProps {
  tag: string;
  pinned: boolean;
}

const PinUnpinTag = ({ tag, pinned }: PinUnpinTagProps) => {
  const [, handleUpdateUISettings] = useUpdateUISettings();

  const handleTogglePinnedTag = () => {
    if (pinned) {
      handleUpdateUISettings({
        type: 'pinnedTagRemove',
        payload: tag,
      });
    } else {
      handleUpdateUISettings({ type: 'pinnedTagAdd', payload: tag });
    }
  };
  return (
    <Button
      variant="icon"
      size="collapsible"
      onClick={handleTogglePinnedTag}
      className="pinButton"
    >
      {pinned ? (
        <XCircle aria-label="pin" weight="duotone" size={18} />
      ) : (
        <CheckCircle aria-label="pin" weight="duotone" size={18} />
      )}
    </Button>
  );
};

interface TagListItemProps extends MetaTag {
  pinned: boolean;
}

export const TagListItem = ({ tag, count, pinned }: TagListItemProps) => {
  return (
    <div className="tagListItem">
      <SidebarLink
        href={`/tag/${tag}`}
        count={count || 0}
        activePath={`/tag/${tag}`}
      >
        {pinned ? (
          <CheckCircle aria-label="Pinned" size={18} weight="fill" />
        ) : (
          <Hash aria-label="tag" size={18} weight="duotone" />
        )}
        {tag}
      </SidebarLink>
      {tag ? <PinUnpinTag pinned={pinned} tag={tag} /> : null}
    </div>
  );
};
