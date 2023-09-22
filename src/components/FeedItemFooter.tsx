import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MINIMUM_CLICK_COUNT } from '@/src/constants';
import { Calendar, NavigationArrow, Rss, Star } from '@phosphor-icons/react';
import urlJoin from 'proper-url-join';
import title from 'title';

// import { useClickBookmark } from '../../hooks';
import { Bookmark } from '../types/db';
import { getRelativeDate } from '../utils/dates';
import { simpleUrl } from '../utils/simpleUrl';
import { Favicon } from './Favicon';
// import { FeedItemActions } from './FeedItemActions';
import { Flex } from './Flex';
import { Link } from './Link';
import { Paragraph } from './Paragraph';
import { TypeToIcon } from './TypeToIcon';

// import { RssFeed } from './RssFeed';

export interface FeedItemFooterProps extends Bookmark {
  allowDeletion?: boolean;
  id: string;
  isInFeed?: boolean;
}

export const FeedItemFooter = (props: FeedItemFooterProps) => {
  const {
    url,
    tags,
    created_at,
    modified_at,
    id,
    star,
    type,
    click_count,
    isInFeed,
    feed,
  } = props;
  // const handleClickRegister = useClickBookmark(id);
  const createdDate = getRelativeDate(created_at);
  const modifiedDate = getRelativeDate(modified_at);
  const dateTooltip =
    created_at !== modified_at
      ? `Created on ${createdDate.formatted}, modified on ${modifiedDate.formatted}`
      : `Created on ${createdDate.formatted}`;

  return (
    <TooltipProvider delayDuration={800} skipDelayDuration={500}>
      <div className="grid gap-1 text-step--2">
        <Flex align="center" gapX="m" wrap="wrap">
          {tags?.length ? (
            <Flex align="center" gap="xs">
              <ul className="list-none p-0 m-0 flex gap-xs flex-wrap">
                {tags.map((tag) => (
                  <li id={tag} key={tag}>
                    <Link href={urlJoin('/tag', tag)}>#{tag}</Link>
                  </li>
                ))}
              </ul>
            </Flex>
          ) : null}
        </Flex>
        <Flex justify="between" gap="3xs" wrap="wrap">
          <Flex align="center" gapX="2xs" gapY="2xs" wrap="wrap">
            {url ? (
              <>
                <Favicon url={url} />
                <Link
                  rel="external"
                  href={url} /* onClick={handleClickRegister} */
                >
                  {simpleUrl(url)}
                </Link>
              </>
            ) : null}

            {star ? <Star size={16} /> : <Star size={16} weight="duotone" />}

            {type !== null ? (
              <Tooltip>
                <TooltipTrigger>
                  <Flex align="center">
                    <Link href={urlJoin('/type', type)}>
                      <TypeToIcon type={type} width="16" />
                    </Link>
                  </Flex>
                </TooltipTrigger>
                <TooltipContent>Type: ${title(type)}</TooltipContent>
              </Tooltip>
            ) : null}

            {click_count > MINIMUM_CLICK_COUNT ? (
              <Tooltip>
                <TooltipTrigger>
                  <Flex align="center" gap="2xs" className="text-step--1">
                    <NavigationArrow weight="duotone" width="16" />
                    {click_count}
                  </Flex>
                </TooltipTrigger>
                <TooltipContent>Click count</TooltipContent>
              </Tooltip>
            ) : null}

            {createdDate.formatted ? (
              <Tooltip>
                <TooltipTrigger>
                  <Flex align="center" gap="3xs">
                    <Calendar weight="duotone" width="16" />
                    <time dateTime={created_at}>
                      {createdDate.ago < 8
                        ? createdDate.relative
                        : createdDate.formatted}
                    </time>
                  </Flex>
                </TooltipTrigger>
                <TooltipContent>{dateTooltip}</TooltipContent>
              </Tooltip>
            ) : null}

            {/* {feed ? (
              <Popover>
                <Tooltip content="View latest RSS feed items">
                  <PopoverTrigger asChild>
                    <Button size="icon">
                      <Rss
                        aria-label="View latest RSS feed items"
                        size={16}
                        weight="duotone"
                      />
                    </Button>
                  </PopoverTrigger>
                </Tooltip>
                <PopoverContent>
                  <Suspense fallback={<Paragraph>Loading...</Paragraph>}>
                    <RssFeed feedUrl={feed} />
                  </Suspense>
                </PopoverContent>
              </Popover>
            ) : null} */}
          </Flex>
          {/* <FeedItemActions
            {...props}
            // handleClickRegister={handleClickRegister}
            key={`actions-${id}`}
            isInFeed={isInFeed}
          /> */}
        </Flex>
      </div>
    </TooltipProvider>
  );
};
