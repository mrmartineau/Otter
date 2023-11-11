import { Bookmark } from '@/src/types/db';
import { Database } from '@/src/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { subDays } from 'date-fns';

interface DashboardFetchingOptions {
  supabaseClient: SupabaseClient<Database>;
}

interface DashboardFetchingResponse {
  recent: Bookmark[];
  oneMonthAgo: Bookmark[];
  twoMonthsAgo: Bookmark[];
  sixMonthsAgo: Bookmark[];
  oneYearAgo: Bookmark[];
}

export const getDashboard = async ({
  supabaseClient,
}: DashboardFetchingOptions): Promise<DashboardFetchingResponse> => {
  const today = new Date();
  const todayMinusOneMonthAgoLower = subDays(today, 31);
  const todayMinusOneMonthAgoUpper = subDays(today, 29);
  const todayMinusTwoMonthsAgoLower = subDays(today, 61);
  const todayMinusTwoMonthsAgoUpper = subDays(today, 59);
  const todayMinusSixMonthsAgoLower = subDays(today, 181);
  const todayMinusSixMonthsAgoUpper = subDays(today, 179);
  const todayMinusOneYearAgoLower = subDays(today, 366);
  const todayMinusOneYearAgoUpper = subDays(today, 364);

  const recentResponse = await supabaseClient
    .from('bookmarks')
    .select('*')
    .limit(4)
    .order('created_at', { ascending: false });
  const oneMonthAgoResponse = await supabaseClient
    .from('bookmarks')
    .select('*')
    .limit(2)
    .order('created_at', { ascending: false })
    .gte('created_at', todayMinusOneMonthAgoLower.toISOString())
    .lte('created_at', todayMinusOneMonthAgoUpper.toISOString());
  const twoMonthAgoResponse = await supabaseClient
    .from('bookmarks')
    .select('*')
    .limit(2)
    .order('created_at', { ascending: false })
    .gte('created_at', todayMinusTwoMonthsAgoLower.toISOString())
    .lte('created_at', todayMinusTwoMonthsAgoUpper.toISOString());
  const sixMonthAgoResponse = await supabaseClient
    .from('bookmarks')
    .select('*')
    .limit(2)
    .order('created_at', { ascending: false })
    .gte('created_at', todayMinusSixMonthsAgoLower.toISOString())
    .lte('created_at', todayMinusSixMonthsAgoUpper.toISOString());
  const oneYearAgoResponse = await supabaseClient
    .from('bookmarks')
    .select('*')
    .limit(2)
    .order('created_at', { ascending: false })
    .gte('created_at', todayMinusOneYearAgoLower.toISOString())
    .lte('created_at', todayMinusOneYearAgoUpper.toISOString());

  return {
    recent: (recentResponse.data as Bookmark[]) ?? [],
    oneMonthAgo: (oneMonthAgoResponse.data as Bookmark[]) ?? [],
    twoMonthsAgo: (twoMonthAgoResponse.data as Bookmark[]) ?? [],
    sixMonthsAgo: (sixMonthAgoResponse.data as Bookmark[]) ?? [],
    oneYearAgo: (oneYearAgoResponse.data as Bookmark[]) ?? [],
  };
};
