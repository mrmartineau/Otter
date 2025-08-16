import { ArrowUpRightIcon } from '@phosphor-icons/react'
import urlJoin from 'proper-url-join'

import type { Bookmark } from '../types/db'
import { Link } from './Link'

interface PossibleMatchingItemsProps {
  items: Bookmark[] | null
}

export const PossibleMatchingItems = ({
  items = [],
}: PossibleMatchingItemsProps) => {
  if (items?.length === 0 || items === null) {
    return null
  }

  return (
    <div className="mt-2xs px-2xs text-step--2">
      <b>Do you already have this item saved?</b>
      <ol className="list-inside list-decimal">
        {items?.slice(0, 3).map((item) => (
          <li key={item.id} className="text-theme10">
            <Link href={urlJoin('/bookmark', item.id)}>View in Otter</Link>
            {item.url ? (
              <>
                {' '}
                —{' '}
                <Link href={item.url} variant="subtle" target="_blank">
                  {item.url} <ArrowUpRightIcon weight="duotone" size={16} />
                </Link>
              </>
            ) : null}
          </li>
        ))}
        {items.length - 3 > 3 && (
          <div>There are {items.length - 3} other matching items</div>
        )}
      </ol>
    </div>
  )
}
