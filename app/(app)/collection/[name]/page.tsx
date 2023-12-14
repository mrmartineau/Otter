import { Feed } from '@/src/components/Feed';
import { Bookmark } from '@/src/types/db';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getCollections } from '@/src/utils/fetching/collections';
import { getDbMetadata } from '@/src/utils/fetching/meta';
import { createServerClient } from '@/src/utils/supabase/server';
import { Cards, Hash } from '@phosphor-icons/react/dist/ssr';
import { Metadata } from 'next';
import { cookies } from 'next/headers';

type Props = {
  params: { name: string };
  searchParams: Partial<ApiParameters>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Collection: ${decodeURIComponent(params.name)}`,
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { limit, offset } = searchParams;
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);
  const collection = decodeURIComponent(params.name);
  const { data, count } = await getCollections({
    supabaseClient,
    params: searchParams,
    name: params.name,
  });
  const collectionTagsResponse = await supabaseClient
    .from('collection_tags_view')
    .select('*')
    .match({ collection: params.name })
    .single();
  const tags = collectionTagsResponse.data?.tags || [];

  // if the collection is also a tag, add it to the subnav
  const dbMetaTags = await supabaseClient.from('tags_count').select('*');
  const matchingTags =
    dbMetaTags?.data &&
    dbMetaTags?.data.filter((item) => {
      return item.tag?.toLowerCase() === collection.toLowerCase();
    });
  for (const tag of matchingTags!) {
    if (tag?.tag) {
      tags.unshift(tag.tag);
    }
  }

  const subNav = tags?.length
    ? tags.map((item) => {
        return {
          text: item,
          href: `/tag/${encodeURIComponent(item)}`,
          isActive: false,
          icon: <Hash weight="duotone" size={18} />,
        };
      })
    : [];

  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={collection}
      icon={<Cards weight="duotone" size={24} />}
      feedType="bookmarks"
      subNav={subNav}
    />
  );
}
