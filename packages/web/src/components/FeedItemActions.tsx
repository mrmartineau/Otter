import {
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  LinkSimpleHorizontalIcon,
  ListPlusIcon,
  PencilIcon,
  ShareNetworkIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import urlJoin from "proper-url-join";
import { DropdownMenu } from "radix-ui";
import { Suspense } from "react";
import { Button } from "@/components/Button";
import { getMetaOptions } from "@/utils/fetching/meta";
import { filteredTags } from "@/utils/filteredTags";
import { supabase } from "@/utils/supabase/client";
import { useClickBookmark } from "../hooks/useClickBookmark";
import { useToggle } from "../hooks/useToggle";
import type { BookmarkFeedItemProps } from "./BookmarkFeedItem";
import { BookmarkForm } from "./BookmarkForm";
import { Dialog, DialogContent, DialogTrigger } from "./Dialog";
import { Loader } from "./Loader";

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
  const [isToggled, , setToggleState] = useToggle();
  const navigate = useNavigate();
  const handleClickRegister = useClickBookmark();
  const { data: bookmarkTags } = useSuspenseQuery(getMetaOptions());
  const queryClient = useQueryClient();

  const handleArchiveBookmark = async () => {
    if (window.confirm("Do you really want to trash this bookmark?")) {
      await supabase
        .from("bookmarks")
        .update({
          modified_at: new Date().toISOString(),
          status: "inactive",
        })
        .match({ id });
      await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    }
  };
  const handleUnArchiveBookmark = async () => {
    await supabase
      .from("bookmarks")
      .update({
        modified_at: new Date().toISOString(),
        status: "active",
      })
      .match({ id });
    await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
  };
  const handleDeleteBookmark = async () => {
    if (window.confirm("Do you really want to delete this bookmark forever?")) {
      await supabase.from("bookmarks").delete().match({ id });
      await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    }
  };

  const handleShare = async (
    platform?: "twitter" | "mastodon",
  ): Promise<void> => {
    if (!url || !title) {
      return;
    }
    const filteredTagsString = filteredTags(tags || []);
    const tagsString =
      filteredTagsString.length > 0 ? `${filteredTagsString}` : "";
    const descriptionString =
      description && description.length > 0 ? ` - ${description}` : "";
    const shareContent = `"${title}"${descriptionString}\n${url}\n${tagsString}`;

    const openFallback = (sharePlatform?: "twitter" | "mastodon") => {
      switch (sharePlatform) {
        case "twitter":
          window.open(
            urlJoin("https://twitter.com/intent/tweet", {
              query: {
                original_referer: window.location.href,
                source: "tweetbutton",
                text: shareContent,
                url,
              },
            }),
          );
          break;
        // case 'mastodon':
        default:
          window.open(
            urlJoin("https://main.elk.zone/intent/post", {
              query: {
                text: shareContent,
              },
            }),
          );
          break;
      }
    };

    // Check if Web Share API is available and functional
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          text: shareContent,
          url,
        });
        return;
      } catch {
        // User cancelled or share failed, fall through to fallback
      }
    }

    // Fallback for browsers without Web Share API (e.g., Firefox desktop)
    openFallback(platform);
  };

  const handleSubmit = () => {
    setToggleState(false);
  };

  const handleDeepLink = () => {
    navigate({ to: urlJoin("/bookmark", id) });
  };

  const handleNavigateToBookmark = () => {
    if (url) {
      handleClickRegister(id);
      window.open(url, "_blank");
    }
  };

  return (
    <div className="feed-item-actions">
      {allowDeletion === false ? (
        <>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" size="xs">
                <ListPlusIcon weight="duotone" size="16" /> More
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
                    <ArrowSquareOutIcon weight="duotone" />
                  </div>
                </DropdownMenu.Item>
              ) : null}
              {typeof navigator?.share === "function" ? (
                <DropdownMenu.Item
                  className="DropdownMenuItem"
                  onClick={() => handleShare()}
                >
                  Share
                  <div className="DropdownMenuItem-rightSlot">
                    <ShareNetworkIcon weight="duotone" />
                  </div>
                </DropdownMenu.Item>
              ) : (
                <>
                  <DropdownMenu.Item
                    className="DropdownMenuItem"
                    onClick={() => handleShare("mastodon")}
                  >
                    Share on Mastodon
                    <div className="DropdownMenuItem-rightSlot">
                      <ShareNetworkIcon weight="duotone" />
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="DropdownMenuItem"
                    onClick={() => handleShare("twitter")}
                  >
                    Share on Twitter
                    <div className="DropdownMenuItem-rightSlot">
                      <ShareNetworkIcon weight="duotone" />
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
                    <LinkSimpleHorizontalIcon weight="duotone" />
                  </div>
                </DropdownMenu.Item>
              )}

              <DropdownMenu.Item
                className="DropdownMenuItem"
                onClick={handleArchiveBookmark}
              >
                Trash
                <div className="DropdownMenuItem-rightSlot">
                  <TrashIcon weight="duotone" />
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
                <PencilIcon weight="duotone" size="16" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent placement="right" width="l">
              <Suspense fallback={<Loader />}>
                <BookmarkForm
                  type="edit"
                  initialValues={{
                    description,
                    image,
                    note,
                    star,
                    tags,
                    title,
                    type,
                    url,
                  }}
                  id={id}
                  onSubmit={handleSubmit}
                  tags={bookmarkTags?.tags}
                />
              </Suspense>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          <Button variant="ghost" size="xs" onClick={handleUnArchiveBookmark}>
            <ArrowCounterClockwiseIcon weight="duotone" size="16" />
            Un-delete
          </Button>
          <Button variant="ghost" size="xs" onClick={handleDeleteBookmark}>
            <TrashIcon weight="duotone" size="16" />
            Permanently delete
          </Button>
        </>
      )}
    </div>
  );
};
