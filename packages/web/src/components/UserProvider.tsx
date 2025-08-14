import { useQuery } from '@tanstack/react-query'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import { queryClient } from '@/router'
import type { UserProfile } from '@/types/db'
import { getUserProfileOptions } from '@/utils/fetching/user'
import { supabase } from '../utils/supabase/client'

export type UseUpdateReturn = (action: UIStateAction) => void
export type UIStateAction =
  | { type: 'pinnedTagAdd'; payload: string }
  | { type: 'pinnedTagRemove'; payload: string }
  | { type: 'settings_tags_visible'; payload: boolean }
  | { type: 'settings_types_visible'; payload: boolean }
  | { type: 'settings_collections_visible'; payload: boolean }
  | { type: 'settings_group_by_date'; payload: boolean }
  | { type: 'settings_top_tags_count'; payload: number | null }
  | { type: 'settings_pinned_tags'; payload: string[] }

interface UserContextType {
  profile: UserProfile | null
  id: string | undefined
  handleUpdateUISettings: UseUpdateReturn
}

const UserContext = createContext<UserContextType | null>(null)

export const useUser = () => {
  const userContext = useContext(UserContext)

  if (!userContext) {
    throw new Error('useUser has to be used within <UserContext.Provider>')
  }

  return userContext
}

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const { data: userProfile } = useQuery(getUserProfileOptions())

  const profileData = userProfile?.data ?? null

  const handleUpdateUISettings = useCallback(
    async (action: UIStateAction) => {
      let column = action.type
      let value = action.payload

      if (action.type === 'pinnedTagAdd') {
        column = 'settings_pinned_tags'
        value = profileData?.settings_pinned_tags?.length
          ? [...profileData.settings_pinned_tags, action.payload]
          : [action.payload]
      } else if (action.type === 'pinnedTagRemove') {
        column = 'settings_pinned_tags'
        value = profileData?.settings_pinned_tags?.length
          ? profileData?.settings_pinned_tags.filter(
              (item) => item !== action.payload
            )
          : []
      }
      await supabase
        .from('profiles')
        .update({ [column]: value, updated_at: new Date().toISOString() })
        .match({ id: profileData?.id })
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
    [profileData]
  )

  return (
    <UserContext.Provider
      value={useMemo(
        () => ({
          handleUpdateUISettings,
          id: profileData?.id,
          profile: profileData,
        }),
        [handleUpdateUISettings, profileData]
      )}
    >
      {children}
    </UserContext.Provider>
  )
}
