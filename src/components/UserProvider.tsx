'use client';

import { ReactNode, createContext, useCallback, useContext } from 'react';

import { useRealtimeProfile } from '../hooks/useRealtime';
import { UserProfile } from '../types/db';
import { createBrowserClient } from '../utils/supabase/client';

export type UseUpdateReturn = (action: UIStateAction) => void;
export type UIStateAction =
  | { type: 'pinnedTagAdd'; payload: string }
  | { type: 'pinnedTagRemove'; payload: string }
  | { type: 'settings_tags_visible'; payload: boolean }
  | { type: 'settings_types_visible'; payload: boolean }
  | { type: 'settings_group_by_date'; payload: boolean }
  | { type: 'settings_top_tags_count'; payload: number | null }
  | { type: 'settings_pinned_tags'; payload: string[] };

interface UserContextType {
  profile: UserProfile | null;
  id: string | undefined;
  handleUpdateUISettings: UseUpdateReturn;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const userContext = useContext(UserContext);

  if (!userContext) {
    throw new Error('useUser has to be used within <UserContext.Provider>');
  }

  return userContext;
};

interface UserProviderProps extends Pick<UserContextType, 'profile' | 'id'> {
  children: ReactNode;
}

export const UserProvider = ({ children, id, profile }: UserProviderProps) => {
  const realtimeProfile = useRealtimeProfile(profile);
  const supabaseClient = createBrowserClient();

  const handleUpdateUISettings = useCallback(
    async (action: UIStateAction) => {
      let column = action.type;
      let value = action.payload;

      if (action.type === 'pinnedTagAdd') {
        column = 'settings_pinned_tags';
        value = realtimeProfile?.settings_pinned_tags?.length
          ? [...realtimeProfile.settings_pinned_tags, action.payload]
          : [action.payload];
      } else if (action.type === 'pinnedTagRemove') {
        column = 'settings_pinned_tags';
        value = realtimeProfile?.settings_pinned_tags?.length
          ? realtimeProfile?.settings_pinned_tags.filter(
              (item) => item !== action.payload,
            )
          : [];
      }
      await supabaseClient
        .from('profiles')
        .update({ [column]: value, updated_at: new Date().toString() })
        .match({ id });
    },
    [id, realtimeProfile?.settings_pinned_tags, supabaseClient],
  );

  return (
    <UserContext.Provider
      value={{
        id,
        profile: realtimeProfile,
        handleUpdateUISettings,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
