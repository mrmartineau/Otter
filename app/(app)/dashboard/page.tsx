import { FeedSimple } from '@/src/components/FeedSimple';
import { Bookmark } from '@/src/types/db';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { getDashboard } from '@/src/utils/fetching/dashboard';
import { createServerClient } from '@/src/utils/supabase/server';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabaseClient = createServerClient(cookieStore);
  // Get recent items, 1 month ago, 2 months ago, 6 months ago & 1 year ago
  const data = await getDashboard({
    supabaseClient,
  });
  
  //
  const followUpResponse = await getBookmarks({
    supabaseClient,
    params: {
      tag: 'follow-up',
      limit: 4,
      status: 'active'
    },
  });

  return (
    <div className="flex flex-col gap-l">
      <FeedSimple items={data.recent} title="Recent" />
      <FeedSimple items={data.oneMonthAgo} title="One month ago" />
      <FeedSimple items={data.twoMonthsAgo} title="Two months ago" />
      <FeedSimple items={data.sixMonthsAgo} title="Six months ago" />
      <FeedSimple items={data.oneYearAgo} title="One year ago" />
      <FeedSimple
        items={followUpResponse.data as Bookmark[]}
        title="#follow-up"
      />
    </div>
  );
}
