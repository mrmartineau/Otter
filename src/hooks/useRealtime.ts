import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

import { Bookmark } from '../types/db';
import { Database } from '../types/supabase';
import { FeedItemModel } from './useGroupByDate';

interface RealtimeBaseProps {
  table: 'bookmarks' | 'profile';
}
interface RealtimeFeedProps {
  initialData: FeedItemModel[];
  isTrash?: boolean;
}
export const useRealtimeFeed = ({
  initialData,
  isTrash,
}: RealtimeFeedProps) => {
  const [items, setItems] = useState<FeedItemModel[]>(initialData);
  const supabaseClient = createClientComponentClient<Database>();

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  useEffect(() => {
    const channel = supabaseClient
      .channel('*')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookmarks' },
        (payload) => {
          console.log(payload);
          switch (payload.eventType) {
            case 'DELETE': {
              // Remove item from list
              setItems((items) =>
                items.filter((item) => item.id !== payload.old.id),
              );
              break;
            }
            case 'INSERT': {
              // Add new item to list
              setItems((items) => [...items, payload.new as FeedItemModel]);
              break;
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
                );
                return;
              }

              setItems((items) =>
                items.map((item) =>
                  item.id === payload.new.id ? (payload.new as Bookmark) : item,
                ),
              );
              break;
            }
            default:
              break;
          }
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, setItems, items]);

  return items;
};

interface RealtimeCollectionProps<T> extends RealtimeBaseProps {
  initialData: T[];
}
export const useRealtimeCollection = <T = unknown>({
  initialData,
  table,
}: RealtimeCollectionProps<T>) => {
  const [items, setItems] = useState<T[]>(initialData);
  const supabaseClient = createClientComponentClient<Database>();

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  useEffect(() => {
    const channel = supabaseClient
      .channel('*')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          console.log(payload);
          switch (payload.event) {
            case 'DELETE':
              setItems((items) =>
                items.filter((item) => item.id !== payload.old.id),
              );
              break;
            case 'INSERT':
              setItems((items) => [...items, payload.new as T]);
              break;
            case 'UPDATE':
              setItems((items) =>
                items.map((item) =>
                  item.id === payload.new.id ? payload.new : item,
                ),
              );
              break;
            default:
              break;
          }

          // setItems((items) => [...items, payload.new as T]);
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, setItems, items]);

  return items;
};

interface RealtimeDictionaryProps<T> extends RealtimeBaseProps {
  initialData: T;
}
export const useRealtimeDictionary = <T = unknown>({
  initialData,
  table,
}: RealtimeDictionaryProps<T>) => {
  const [items, setItems] = useState<T>(initialData);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  useEffect(() => {
    const channel = supabase
      .channel('*')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          console.log(payload);
          setItems((items) => ({ ...items, ...(payload.new as T) }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, setItems, items]);

  return items;
};
