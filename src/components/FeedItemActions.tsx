import { Button } from '@/components/ui/button';
import {
  Archive,
  ArrowSquareOut,
  Copy,
  LinkSimpleHorizontal,
  ListPlus,
  Pencil,
  ShareNetwork,
  Star,
  Trash,
} from '@phosphor-icons/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import urlJoin from 'proper-url-join';

import { useClickBookmark } from '../hooks/useClickBookmark';
import { useToggle } from '../hooks/useToggle';
import { BookmarkFeedItemProps } from './BookmarkFeedItem';
import { BookmarkForm } from './BookmarkForm';
import { Dialog, DialogContent, DialogTrigger } from './Dialog';
import './FeedItemActions.css';
import { Flex } from './Flex';

interface FeedItemActionsProps extends BookmarkFeedItemProps {
  isInFeed?: boolean;
}

export const FeedItemActions = ({
  title,
  url,
  description,
  note,
  tags,
  id,
  star,
  type,
  image,
  allowDeletion,
  isInFeed = true,
}: FeedItemActionsProps) => {
  const supabaseClient = createClientComponentClient();
  const [isToggled, , setToggleState] = useToggle();
  const router = useRouter();
  const handleClickRegister = useClickBookmark();

  const handleArchiveBookmark = async () => {
    if (window.confirm('Do you really want to trash this bookmark?')) {
      await supabaseClient
        .from('bookmarks')
        .update({
          status: 'inactive',
          modified_at: new Date(),
        })
        .match({ id });
    }
  };
  const handleDeleteBookmark = async () => {
    if (window.confirm('Do you really want to delete this bookmark forever?')) {
      await supabaseClient.from('bookmarks').delete().match({ id });
    }
  };
  const handleToggleStar = async (): Promise<void> => {
    await supabaseClient
      .from('bookmarks')
      .update({
        star: !star,
        modified_at: new Date(),
      })
      .match({ id });
  };
  const handleCopyUrl = (): void => {
    if (!url) {
      return;
    }
    navigator.clipboard.writeText(url);
  };

  const handleShare = async (): Promise<void> => {
    if (!url || !title) {
      return;
    }
    try {
      await navigator.share({
        title,
        text: description || note || '',
        url,
      });
    } catch (err) {
      window.open(
        urlJoin('https://twitter.com/intent/tweet', {
          query: {
            original_referer: window.location.href,
            source: 'tweetbutton',
            text: `${title} — ${description}`,
            url,
            hashtags: tags?.join(',') || '',
          },
        }),
      );
    }
  };

  const handleSubmit = () => {
    setToggleState(false);
  };

  const handleDeepLink = () => {
    router.push(urlJoin('/bookmark', id));
  };

  const handleNavigateToBookmark = () => {
    if (url) {
      handleClickRegister(id);
      window.open(url, '_blank');
    }
  };

  return (
    <Flex gap="3xs" className="feedItemActions">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="xs">
            <ListPlus weight="duotone" size="16" /> More
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content className="DropdownMenuContent" sideOffset={0}>
          {!allowDeletion && (
            <DropdownMenu.Item
              className="DropdownMenuItem"
              onClick={handleToggleStar}
            >
              {star ? (
                <>
                  Unstar
                  <div className="DropdownMenuItem-rightSlot">
                    <Star weight="fill" />
                  </div>
                </>
              ) : (
                <>
                  Star
                  <div className="DropdownMenuItem-rightSlot">
                    <Star weight="duotone" />
                  </div>
                </>
              )}
            </DropdownMenu.Item>
          )}
          {url ? (
            <DropdownMenu.Item
              className="DropdownMenuItem"
              onClick={handleNavigateToBookmark}
            >
              Open in new tab
              <div className="DropdownMenuItem-rightSlot">
                <ArrowSquareOut weight="duotone" />
              </div>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item className="DropdownMenuItem" onClick={handleShare}>
            Share on Twitter
            <div className="DropdownMenuItem-rightSlot">
              <ShareNetwork weight="duotone" />
            </div>
          </DropdownMenu.Item>
          {isInFeed && (
            <DropdownMenu.Item
              className="DropdownMenuItem"
              onClick={handleDeepLink}
            >
              Deep link
              <div className="DropdownMenuItem-rightSlot">
                <LinkSimpleHorizontal weight="duotone" />
              </div>
            </DropdownMenu.Item>
          )}
          {url ? (
            <DropdownMenu.Item
              className="DropdownMenuItem"
              onClick={handleCopyUrl}
            >
              Copy URL to clipboard
              <div className="DropdownMenuItem-rightSlot">
                <Copy weight="duotone" />
              </div>
            </DropdownMenu.Item>
          ) : null}
          {allowDeletion ? (
            <DropdownMenu.Item
              className="DropdownMenuItem"
              onClick={handleDeleteBookmark}
            >
              Permanently delete
              <div className="DropdownMenuItem-rightSlot">
                <Trash weight="duotone" />
              </div>
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item
              className="DropdownMenuItem"
              onClick={handleArchiveBookmark}
            >
              Archive
              <div className="DropdownMenuItem-rightSlot">
                <Archive weight="duotone" />
              </div>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Arrow className="DropdownMenuArrow" />
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <Dialog
        open={isToggled}
        onOpenChange={(open) => {
          setToggleState(open);
        }}
      >
        <DialogTrigger
          asChild
          onClick={() => {
            setToggleState(true);
          }}
        >
          <Button variant="ghost" size="xs">
            <Pencil weight="duotone" size="16" /> Edit
          </Button>
        </DialogTrigger>
        <DialogContent placement="right" width="m" title="Edit">
          <BookmarkForm
            type="edit"
            initialValues={{
              title,
              url,
              description,
              note,
              tags,
              star,
              type,
              image,
            }}
            id={id}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </Flex>
  );
};
