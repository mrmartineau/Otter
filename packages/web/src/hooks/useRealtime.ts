import { useEffect, useState } from 'react'

import type { Bookmark, UserProfile } from '../types/db'
import { supabase } from '../utils/supabase/client'
import type { FeedItemModel } from './useGroupByDate'

/**
 * Realtime feed: bookmarks, toots & tweets
 */
interface RealtimeFeedProps {
  initialData: FeedItemModel[]
  isTrash?: boolean
  table?: 'bookmarks' | 'tweets' | 'toots'
}
export const useRealtimeFeed = ({
  initialData,
  isTrash,
  table = 'bookmarks',
}: RealtimeFeedProps) => {
  const [items, setItems] = useState<FeedItemModel[]>(initialData)

  useEffect(() => {
    setItems(initialData)
  }, [initialData])

  useEffect(() => {
    const channel = supabase
      .channel('realtime feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          switch (payload.eventType) {
            case 'DELETE': {
              // Remove item from list
              setItems((items) =>
                items.filter((item) => item.id !== payload.old.id),
              )
              break
            }
            case 'INSERT': {
              // Add new item to list
              setItems((items) => [...items, payload.new as FeedItemModel])
              break
            }
            case 'UPDATE': {
              // Remove item from list if:
              // - on the trash page and the status is active
              // - on the normal pages and the status is inactive
              if (
                (isTrash && payload.new.status === 'active') ||
                (!isTrash && payload.new.status === 'inactive')
              ) {
                setItems((items) =>
                  items.filter((item) => item.id !== payload.new.id),
                )
                return
              }

              setItems((items) =>
                items.map((item) =>
                  item.id === payload.new.id ? (payload.new as Bookmark) : item,
                ),
              )
              break
            }
            default:
              break
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, isTrash])

  return items
}

/**
 * Realtime profile
 */
export const useRealtimeProfile = (initialData: UserProfile | null) => {
  const [profile, setProfile] = useState<UserProfile | null>(initialData)

  useEffect(() => {
    setProfile(initialData)
  }, [initialData])

  useEffect(() => {
    const channel = supabase
      .channel('realtime profile')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          setProfile(payload.new as UserProfile)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return profile
}
