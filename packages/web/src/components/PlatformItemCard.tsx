import {
  CheckCircleIcon,
  LinkSimpleHorizontalIcon,
  PlusCircleIcon,
} from '@phosphor-icons/react'
import { isPlatformId, PLATFORMS } from '@/platforms/catalog'
import type { PlatformItem, PlatformItemAuthor } from '@/types/db'
import { useConvertPlatformItemMutation } from '@/utils/fetching/platforms'
import { simpleUrl } from '../utils/simpleUrl'
import { Button } from './Button'
import { Flex } from './Flex'
import { Link } from './Link'

export const PlatformItemCard = (props: PlatformItem) => {
  const {
    bookmark_id,
    description,
    id,
    image,
    metadata,
    platform,
    title,
    url,
  } = props
  const convertMutation = useConvertPlatformItemMutation()
  const definition = isPlatformId(platform) ? PLATFORMS[platform] : null
  const author = (metadata as { author?: PlatformItemAuthor } | null)?.author
  const showThumbnail = Boolean(image) && !author

  return (
    <div className="card feed-item">
      {author ? (
        <div className="flex items-center gap-xs">
          {author.avatar ? (
            <img src={author.avatar} alt="" className="feed-avatar" />
          ) : null}
          <Flex direction="column">
            <div className="text-step--1">
              {author.displayName ?? author.handle}
            </div>
            <div className="text-step--2">@{author.handle}</div>
          </Flex>
        </div>
      ) : null}

      <div className="feed-item-cols">
        <div className="feed-item-content">
          {title ? (
            url ? (
              <Link rel="external" href={url} className="text-step-0">
                {title}
              </Link>
            ) : (
              <div className="text-step-0">{title}</div>
            )
          ) : null}
          {description ? (
            <p className="line-clamp-4 text-step--1">{description}</p>
          ) : null}
        </div>
        {showThumbnail && image ? (
          <img src={image} alt="" className="max-w-full rounded-md" />
        ) : null}
      </div>

      <Flex gap="xs" align="center" wrap="wrap">
        <Button
          size="xs"
          variant="ghost"
          disabled={Boolean(bookmark_id) || convertMutation.isPending}
          onClick={() => {
            if (isPlatformId(platform)) {
              convertMutation.mutate({ id, platform })
            }
          }}
        >
          {bookmark_id ? (
            <>
              <CheckCircleIcon weight="duotone" size={14} /> Bookmarked
            </>
          ) : (
            <>
              <PlusCircleIcon weight="duotone" size={14} /> Add bookmark
            </>
          )}
        </Button>
        {url ? (
          <Link
            rel="external"
            href={url}
            className="flex items-center gap-2xs text-step--1"
          >
            <LinkSimpleHorizontalIcon weight="duotone" size="14" />{' '}
            {definition ? definition.name : simpleUrl(url)}
          </Link>
        ) : null}
      </Flex>
    </div>
  )
}
