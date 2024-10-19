'use client';

import { Button } from '@/src/components/Button';
import { useToggle } from '@/src/hooks/useToggle';
import { Bookmark, Toot, Tweet } from '@/src/types/db';
import { DbMetaResponse } from '@/src/utils/fetching/meta';
import { simpleUrl } from '@/src/utils/simpleUrl';
import {
  ArrowElbowDownLeft,
  ArrowFatLinesUp,
  Calendar,
  Cards,
  CheckCircle,
  Gauge,
  Gear,
  Hash,
  List,
  ListBullets,
  ListDashes,
  MagnifyingGlass,
  PlusCircle,
  Star,
} from '@phosphor-icons/react';
import { Command } from 'cmdk';
import throttle from 'lodash.throttle';
import {
  DispatchWithoutAction,
  createContext,
  useEffect,
  useState,
} from 'react';
import tinyRelativeDate from 'tiny-relative-date';
import formatTitle from 'title';

import {
  ROUTE_DASHBOARD,
  ROUTE_FEED,
  ROUTE_NEW_BOOKMARK,
  ROUTE_SETTINGS_ACCOUNT,
  ROUTE_STARS,
  ROUTE_STATS,
} from '../../constants';
import { ApiResponse } from '../../types/api';
import { Favicon } from '../Favicon';
import { Flex } from '../Flex';
import { TypeToIcon } from '../TypeToIcon';
import { useUser } from '../UserProvider';
import './CmdK.css';
import { AccessoryModel, Item } from './Item';
import { fetchSearch } from './fetchSearch';

const listFormat = new Intl.ListFormat('en', {
  style: 'long',
  type: 'conjunction',
});

export type TweetSearchResponse = ApiResponse<Tweet[]>;

export interface CmdKContextInterface {
  toggleOpen: DispatchWithoutAction;
}
export const CmdKContext = createContext<CmdKContextInterface>(
  {} as CmdKContextInterface,
);

const sharedAccessories: AccessoryModel[] = [
  {
    Icon: <ArrowElbowDownLeft aria-label="Go" className="actionIcon" />,
  },
];

interface CmdKProps {
  serverDbMeta: DbMetaResponse;
}
export const CmdK = ({ serverDbMeta }: CmdKProps) => {
  const { profile, handleUpdateUISettings } = useUser();
  const [open, toggleOpen, setOpen] = useToggle(false);
  const [bookmarkItems, setBookmarkItems] = useState<Bookmark[]>([]);
  const [tweetItems, setTweetItems] = useState<Tweet[]>([]);
  const [tootItems, setTootItems] = useState<Toot[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const dbMeta = serverDbMeta;

  const handleSetGroupByDate = (newState: boolean) => {
    if (profile?.settings_group_by_date !== newState) {
      handleUpdateUISettings({
        type: 'settings_group_by_date',
        payload: newState,
      });
    }
  };
  const groupByDate = profile?.settings_group_by_date;

  const throttledMutate = throttle(async (value: string) => {
    await fetchSearch(value).then((data) => {
      setBookmarkItems((data?.bookmarksSearch?.data as Bookmark[]) ?? []);
      setTweetItems(data?.tweetsSearch?.data ?? []);
      setTootItems(data?.tootsSearch?.data ?? []);
    });
  }, 1000);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        toggleOpen();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggleOpen]);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
    }
  }, [open]);

  return (
    <>
      <Button
        variant="cmdk"
        aria-label="Search Otter"
        onClick={toggleOpen}
        className="h-10"
      >
        <MagnifyingGlass weight="duotone" size="25" />
        Search
        <Flex align="center" justify="center" className="cmdk-button-label">
          CMD+K
        </Flex>
      </Button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Search"
        onKeyDown={(event) => {
          // Escape clears searchTerm if there results > 0
          if (event.key === 'Escape' && searchTerm.length) {
            event.preventDefault();
            setSearchTerm('');
          }
        }}
      >
        <Command.Input
          value={searchTerm}
          onValueChange={(value) => {
            setSearchTerm(value);
            throttledMutate(value);
          }}
          placeholder="What do you need?"
        />
        <CmdKContext.Provider value={{ toggleOpen }}>
          <Command.List>
            <Command.Empty className="cmdk-empty">
              🙁 No results found.
            </Command.Empty>

            {/* Search */}
            {searchTerm.length && bookmarkItems?.length ? (
              <Command.Group heading="Bookmarks">
                {bookmarkItems?.map(
                  ({
                    id,
                    title,
                    description,
                    note,
                    url,
                    type,
                    tags,
                    created_at,
                  }) => {
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
                      tooltip: `Added: ${tinyRelativeDate(
                        new Date(created_at),
                      )}`,
                    });

                    const value = [title, description?.slice(0, 30), url]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <Item
                        key={`bookmark-${id}`}
                        value={value}
                        to={`/bookmark/${id}`}
                        url={url}
                        accessories={accessories}
                        image={url ? <Favicon url={url} /> : null}
                      >
                        {titleReplacement}
                      </Item>
                    );
                  },
                )}
                <Item
                  to={`/search?q=${searchTerm}`}
                  value={`search-${searchTerm}`}
                  image={
                    <MagnifyingGlass weight="duotone" aria-label="Search" />
                  }
                  accessories={sharedAccessories}
                >
                  Full site search
                </Item>
              </Command.Group>
            ) : null}

            {/* Tags */}
            {searchTerm.length ? (
              <Command.Group heading="Tags">
                {dbMeta?.tags.map(({ tag }) => {
                  return (
                    <Item
                      key={`tag-all-${tag}`}
                      to={`/tag/${tag}`}
                      value={`tag-${tag}`}
                      image={
                        <Hash weight="duotone" aria-label={`Tag: ${tag}`} />
                      }
                      accessories={sharedAccessories}
                    >
                      {tag}
                    </Item>
                  );
                })}
              </Command.Group>
            ) : profile?.settings_pinned_tags?.length ? (
              <Command.Group heading="Pinned tags">
                {profile.settings_pinned_tags.map((item) => {
                  return (
                    <Item
                      key={`tag-pinned-${item}`}
                      to={`/tag/${item}`}
                      value={`tag-pinned-${item}`}
                      image={
                        <Hash weight="duotone" aria-label={`Tag: ${item}`} />
                      }
                      accessories={sharedAccessories}
                    >
                      {item}
                    </Item>
                  );
                })}
              </Command.Group>
            ) : null}

            {/* Collections */}
            {searchTerm.length && dbMeta?.collections?.length ? (
              <Command.Group heading="Collections">
                {dbMeta.collections.map(({ collection }) => {
                  return (
                    <Item
                      key={`collection-${collection}`}
                      to={`/collection/${collection}`}
                      value={`collection-${collection}`}
                      image={
                        <Cards
                          weight="duotone"
                          aria-label={`Collection: ${collection}`}
                        />
                      }
                      accessories={sharedAccessories}
                    >
                      {collection}
                    </Item>
                  );
                })}
              </Command.Group>
            ) : null}

            {/* Navigation */}
            <Command.Group heading="Navigation">
              <Item
                to={ROUTE_NEW_BOOKMARK}
                value="Add new bookmark"
                image={<PlusCircle weight="duotone" aria-label="New" />}
                accessories={sharedAccessories}
              >
                Add new item
              </Item>
              <Item
                to={ROUTE_DASHBOARD}
                value="Dashboard"
                image={<Gauge weight="duotone" aria-label="Dashboard" />}
                accessories={sharedAccessories}
              >
                Dashboard
              </Item>
              <Item
                to={ROUTE_FEED}
                value="All"
                image={<ListBullets weight="duotone" aria-label="All" />}
                accessories={sharedAccessories}
              >
                All items
              </Item>
              <Item
                to={ROUTE_STARS}
                value="Stars"
                image={<Star weight="duotone" aria-label="Stars" />}
                accessories={sharedAccessories}
              >
                Stars
              </Item>
              <Item
                to={ROUTE_STATS}
                value="Top links"
                image={
                  <ArrowFatLinesUp weight="duotone" aria-label="Top links" />
                }
                accessories={sharedAccessories}
              >
                Top links
              </Item>
              <Item
                to={ROUTE_SETTINGS_ACCOUNT}
                value="Settings"
                image={<Gear weight="duotone" aria-label="Settings" />}
                accessories={sharedAccessories}
              >
                Settings
              </Item>
            </Command.Group>

            {/* Types */}
            {dbMeta.types?.length ? (
              <Command.Group heading="Types">
                {dbMeta.types.map(({ type }) => {
                  if (!type) {
                    return null;
                  }
                  return (
                    <Item
                      key={`type-${type}`}
                      to={`/type/${type}`}
                      value={`type-${type}`}
                      image={<TypeToIcon type={type} />}
                      accessories={sharedAccessories}
                    >
                      {formatTitle(type)}
                    </Item>
                  );
                })}
              </Command.Group>
            ) : null}

            {/* Toots */}
            {searchTerm.length && tootItems?.length ? (
              <Command.Group heading="Toots">
                {tootItems?.map(({ id, text, user_avatar, user_id }) => {
                  if (!text) {
                    return null;
                  }

                  const value = [text].filter(Boolean).join(' ');
                  return (
                    <Item key={`toot-${id}`} value={value} to={`/toots/${id}`}>
                      <div>
                        <Flex align="center" gap="xs" className="mb-2xs">
                          {user_avatar ? (
                            <img
                              src={user_avatar}
                              width="20px"
                              className="rounded-full"
                            />
                          ) : null}
                          <span>{user_id}</span>
                        </Flex>
                        {text}
                      </div>
                    </Item>
                  );
                })}
              </Command.Group>
            ) : null}

            {/* Tweets */}
            {searchTerm.length && tweetItems?.length ? (
              <Command.Group heading="Tweets">
                {tweetItems?.map(({ id, text, user_avatar, user_id }) => {
                  if (!text) {
                    return null;
                  }

                  const value = [text].filter(Boolean).join(' ');
                  return (
                    <Item
                      key={`tweet-${id}`}
                      value={value}
                      to={`/tweets/${id}`}
                    >
                      <div>
                        <Flex align="center" gap="xs" className="mb-2xs">
                          {user_avatar ? (
                            <img
                              src={user_avatar}
                              width="20px"
                              className="rounded-full"
                            />
                          ) : null}
                          <span>@{user_id}</span>
                        </Flex>
                        {text}
                      </div>
                    </Item>
                  );
                })}
              </Command.Group>
            ) : null}

            {/* Settings */}
            <Command.Group heading="Settings">
              <Item
                action={() => handleSetGroupByDate(false)}
                value="Display flat feed"
                image={<List weight="duotone" aria-label="Flat feed" />}
                accessories={sharedAccessories}
              >
                Display flat feed{' '}
                {!groupByDate && (
                  <CheckCircle aria-label="Flat feed" weight="fill" />
                )}
              </Item>
              <Item
                action={() => handleSetGroupByDate(true)}
                value="Group feed by day"
                image={
                  <ListDashes weight="duotone" aria-label="Grouped feed" />
                }
                accessories={sharedAccessories}
              >
                Display feed grouped by day{' '}
                {groupByDate && (
                  <CheckCircle aria-label="Flat feed" weight="fill" />
                )}
              </Item>
            </Command.Group>
          </Command.List>
        </CmdKContext.Provider>
      </Command.Dialog>
    </>
  );
};
