import { filteredTags } from '@/app/api/toot/utils';
import { Button } from '@/src/components/Button';
import {
  ArrowCounterClockwise,
  ArrowSquareOut,
  Copy,
  LinkSimpleHorizontal,
  ListPlus,
  Pencil,
  ShareNetwork,
  Trash,
} from '@phosphor-icons/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useRouter } from 'next/navigation';
import urlJoin from 'proper-url-join';
import { useEffect, useState } from 'react';

import { useClickBookmark } from '../hooks/useClickBookmark';
import { useToggle } from '../hooks/useToggle';
import { createBrowserClient } from '../utils/supabase/client';
import { BookmarkFeedItemProps } from './BookmarkFeedItem';
import { BookmarkForm } from './BookmarkForm';
import { Dialog, DialogContent, DialogTrigger } from './Dialog';
import './FeedItemActions.css';

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
  allowDeletion = false,
  isInFeed = true,
}: FeedItemActionsProps) => {
  const supabaseClient = createBrowserClient();
  const [isToggled, , setToggleState] = useToggle();
  const router = useRouter();
  const handleClickRegister = useClickBookmark();
  const [canShare, setCanShare] = useState<boolean>(false);

  const handleArchiveBookmark = async () => {
    if (window.confirm('Do you really want to trash this bookmark?')) {
      await supabaseClient
        .from('bookmarks')
        .update({
          status: 'inactive',
          modified_at: new Date().toISOString(),
        })
        .match({ id });
    }
  };
  const handleUnArchiveBookmark = async () => {
    await supabaseClient
      .from('bookmarks')
      .update({
        status: 'active',
        modified_at: new Date().toISOString(),
      })
      .match({ id });
  };
  const handleDeleteBookmark = async () => {
    if (window.confirm('Do you really want to delete this bookmark forever?')) {
      await supabaseClient.from('bookmarks').delete().match({ id });
    }
  };

  const handleCopyUrl = (): void => {
    if (!url) {
      return;
    }
    navigator.clipboard.writeText(url);
  };

  const handleShare = async (
    platform?: 'twitter' | 'mastodon',
  ): Promise<void> => {
    if (!url || !title) {
      return;
    }
    const filteredTagsString = filteredTags(tags || []);
    const tagsString =
      filteredTagsString.length > 0 ? `${filteredTagsString}` : '';
    const descriptionString =
      description!?.length > 0 ? ` - ${description}` : '';
    const shareContent = `"${title}"${descriptionString}\n${url}\n${tagsString}`;

    try {
      await navigator.share({
        text: shareContent,
        url,
      });
    } catch (err) {
      switch (platform) {
        case 'twitter':
          window.open(
            urlJoin('https://twitter.com/intent/tweet', {
              query: {
                original_referer: window.location.href,
                source: 'tweetbutton',
                text: shareContent,
                url,
              },
            }),
          );
          break;
        case 'mastodon':
        default:
          window.open(
            urlJoin('https://main.elk.zone/intent/post', {
              query: {
                text: shareContent,
              },
            }),
          );
          break;
      }
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

  useEffect(() => {
    if (
      window.navigator &&
      window.navigator.canShare &&
      window.navigator.canShare({ text: '' })
    ) {
      setCanShare(true);
    }
  }, []);

  return (
    <div className="feed-item-actions">
      {allowDeletion === false ? (
        <>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" size="xs">
                <ListPlus weight="duotone" size="16" /> More
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content
              className="DropdownMenuContent"
              sideOffset={0}
            >
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
              {canShare ? (
                <DropdownMenu.Item
                  className="DropdownMenuItem"
                  onClick={() => handleShare()}
                >
                  Share
                  <div className="DropdownMenuItem-rightSlot">
                    <ShareNetwork weight="duotone" />
                  </div>
                </DropdownMenu.Item>
              ) : (
                <>
                  <DropdownMenu.Item
                    className="DropdownMenuItem"
                    onClick={() => handleShare('mastodon')}
                  >
                    Share on Mastodon
                    <div className="DropdownMenuItem-rightSlot">
                      <ShareNetwork weight="duotone" />
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="DropdownMenuItem"
                    onClick={() => handleShare('twitter')}
                  >
                    Share on Twitter
                    <div className="DropdownMenuItem-rightSlot">
                      <ShareNetwork weight="duotone" />
                    </div>
                  </DropdownMenu.Item>
                </>
              )}
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

              <DropdownMenu.Item
                className="DropdownMenuItem"
                onClick={handleArchiveBookmark}
              >
                Trash
                <div className="DropdownMenuItem-rightSlot">
                  <Trash weight="duotone" />
                </div>
              </DropdownMenu.Item>
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
            <DialogContent placement="right" width="l">
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
        </>
      ) : (
        <>
          <Button variant="ghost" size="xs" onClick={handleUnArchiveBookmark}>
            <ArrowCounterClockwise weight="duotone" size="16" />
            Un-delete
          </Button>
          <Button variant="ghost" size="xs" onClick={handleDeleteBookmark}>
            <Trash weight="duotone" size="16" />
            Permanently delete
          </Button>
        </>
      )}
    </div>
  );
};
