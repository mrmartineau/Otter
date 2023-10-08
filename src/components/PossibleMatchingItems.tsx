import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import urlJoin from 'proper-url-join';

import { Bookmark } from '../types/db';
import { simpleUrl } from '../utils/simpleUrl';
import { Link } from './Link';

interface PossibleMatchingItemsProps {
  items: Bookmark[] | null;
}

export const PossibleMatchingItems = ({
  items = [],
}: PossibleMatchingItemsProps) => {
  if (items?.length === 0 || items === null) {
    return null;
  }

  return (
    <div className="flow my-2xs rounded-m border border-solid border-theme3 bg-theme2 p-2xs text-step--2">
      <h5 className="my-0 text-step--1 font-medium">
        Do you already have this item saved?
      </h5>
      <ol className="list-inside list-decimal">
        {items?.slice(0, 3).map((item) => (
          <li key={item.id} className="text-theme10">
            <Link href={urlJoin('/bookmark', item.id)}>View in Otter</Link>
            {item.url ? (
              <>
                {' '}
                —{' '}
                <Link href={item.url} variant="subtle" target="_blank">
                  {item.url} <ArrowUpRight weight="duotone" size={16} />
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
  );
};
