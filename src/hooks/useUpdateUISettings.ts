'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useState } from 'react';

import { useUser } from '../components/UserProvider';
import { UserProfile } from '../types/db';

type UIState = UserProfile['settings'];
const emptyState: UIState = {
  uiState: {
    tags: false,
    types: false,
    groupByDate: false,
    pinnedTags: [],
    topTags: false,
    topTagsLimit: 0,
  },
};

type UIStateAction =
  | { type: 'pinnedTagAdd'; payload: string }
  | { type: 'pinnedTagRemove'; payload: string }
  | { type: 'tags' }
  | { type: 'types' }
  | { type: 'groupByDate' }
  | {
      type: 'topTags';
      payload: {
        limit: number;
        active: boolean;
      };
    };

const UIStateReducer = (state: UIState, action: UIStateAction): UIState => {
  switch (action.type) {
    case 'pinnedTagAdd':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          pinnedTags: [...state.uiState.pinnedTags, action.payload],
        },
      };
    case 'pinnedTagRemove':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          pinnedTags: state.uiState.pinnedTags.filter(
            (item) => item !== action.payload,
          ),
        },
      };
    case 'tags':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          tags: !state.uiState.tags,
        },
      };
    case 'types':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          types: !state.uiState.types,
        },
      };
    case 'groupByDate':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          groupByDate: !state.uiState.groupByDate,
        },
      };
    case 'topTags':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          topTags: action.payload.active,
          topTagsLimit: action.payload.limit,
        },
      };
    default:
      return state;
  }
};

type UseUpdateReturn = [
  settings: UIState,
  handleUpdateState: (action: UIStateAction) => void,
];

/**
 * @name useUpdateUISettings
 * @description update UI settings
 */
export const useUpdateUISettings = (): UseUpdateReturn => {
  const { id, profile } = useUser();
  const supabaseClient = createClientComponentClient();
  const profileId = id;
  const initialState = profile?.settings || emptyState;
  const [settings, setSettings] = useState<UIState>(initialState);

  const handleUpdateUISettings = useCallback(async (action: UIStateAction) => {
    const newSettings = UIStateReducer(settings, action);
    setSettings(newSettings);
    await supabaseClient
      .from('profiles')
      .update({ settings: newSettings })
      .match({ id: profileId })
      .single();

    return newSettings;
  }, []);

  return [settings, handleUpdateUISettings];
};
