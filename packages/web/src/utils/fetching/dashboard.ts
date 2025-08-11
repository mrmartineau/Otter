import { queryOptions } from '@tanstack/react-query'
import { subDays } from 'date-fns'
import type { Bookmark } from '../../types/db'
import { supabase } from '../supabase/client'

interface DashboardFetchingResponse {
  recent: Bookmark[]
  oneWeekAgo: Bookmark[]
  oneMonthAgo: Bookmark[]
  twoMonthsAgo: Bookmark[]
  sixMonthsAgo: Bookmark[]
  oneYearAgo: Bookmark[]
}

export const getDashboard = async (): Promise<DashboardFetchingResponse> => {
  const today = new Date()
  const todayMinusOneWeekAgoLower = subDays(today, 8)
  const todayMinusOneWeekAgoUpper = subDays(today, 6)
  const todayMinusOneMonthAgoLower = subDays(today, 31)
  const todayMinusOneMonthAgoUpper = subDays(today, 29)
  const todayMinusTwoMonthsAgoLower = subDays(today, 61)
  const todayMinusTwoMonthsAgoUpper = subDays(today, 59)
  const todayMinusSixMonthsAgoLower = subDays(today, 181)
  const todayMinusSixMonthsAgoUpper = subDays(today, 179)
  const todayMinusOneYearAgoLower = subDays(today, 366)
  const todayMinusOneYearAgoUpper = subDays(today, 364)

  const recentResponse = await supabase
    .from('bookmarks')
    .select('*')
    .limit(4)
    .order('created_at', { ascending: false })
    .match({ status: 'active' })
  const oneWeekAgoResponse = await supabase
    .from('bookmarks')
    .select('*')
    .limit(5)
    .order('created_at', { ascending: false })
    .gte('created_at', todayMinusOneWeekAgoLower.toISOString())
    .lte('created_at', todayMinusOneWeekAgoUpper.toISOString())
    .match({ status: 'active' })
  const oneMonthAgoResponse = await supabase
    .from('bookmarks')
    .select('*')
    .limit(5)
    .order('created_at', { ascending: false })
    .gte('created_at', todayMinusOneMonthAgoLower.toISOString())
    .lte('created_at', todayMinusOneMonthAgoUpper.toISOString())
    .match({ status: 'active' })
  const twoMonthAgoResponse = await supabase
    .from('bookmarks')
    .select('*')
    .limit(5)
    .order('created_at', { ascending: false })
    .gte('created_at', todayMinusTwoMonthsAgoLower.toISOString())
    .lte('created_at', todayMinusTwoMonthsAgoUpper.toISOString())
    .match({ status: 'active' })
  const sixMonthAgoResponse = await supabase
    .from('bookmarks')
    .select('*')
    .limit(5)
    .order('created_at', { ascending: false })
    .gte('created_at', todayMinusSixMonthsAgoLower.toISOString())
    .lte('created_at', todayMinusSixMonthsAgoUpper.toISOString())
    .match({ status: 'active' })
  const oneYearAgoResponse = await supabase
    .from('bookmarks')
    .select('*')
    .limit(5)
    .order('created_at', { ascending: false })
    .gte('created_at', todayMinusOneYearAgoLower.toISOString())
    .lte('created_at', todayMinusOneYearAgoUpper.toISOString())
    .match({ status: 'active' })

  return {
    oneMonthAgo: (oneMonthAgoResponse.data as Bookmark[]) ?? [],
    oneWeekAgo: (oneWeekAgoResponse.data as Bookmark[]) ?? [],
    oneYearAgo: (oneYearAgoResponse.data as Bookmark[]) ?? [],
    recent: (recentResponse.data as Bookmark[]) ?? [],
    sixMonthsAgo: (sixMonthAgoResponse.data as Bookmark[]) ?? [],
    twoMonthsAgo: (twoMonthAgoResponse.data as Bookmark[]) ?? [],
  }
}

export const getDashboardOptions = () => {
  return queryOptions({
    queryFn: () => getDashboard(),
    queryKey: ['bookmarks', 'dashboard'],
    staleTime: 5 * 1000,
  })
}
