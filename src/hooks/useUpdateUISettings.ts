import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

export type ProfileResponse = {
  username: string;
  id: string;
  avatar_url: string;
  updated_at: string;
  settings: {
    uiState: {
      tags: boolean;
      types: boolean;
      groupByDate: boolean;
      pinnedTags: string[];
      topTags: boolean;
      topTagsLimit: number;
    };
  };
};
type UIState = ProfileResponse['settings'];
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

/**
 * @name useUpdateUISettings
 * @description update UI settings
 */
export const useUpdateUISettings = (): [
  settings: ProfileResponse['settings'],
  handleUpdateState: (action: UIStateAction) => void,
] => {
  const supabaseClient = createClientComponentClient();
  const [profileData, setProfileData] = useState<ProfileResponse>();
  const profileId = profileData?.id;
  const initialState = profileData?.settings || emptyState;
  const [state, setState] = useState<ProfileResponse['settings']>(initialState);

  useEffect(() => {
    const getInfo = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      const userProfile = await supabaseClient
        .from('profiles')
        .select('*')
        .match({ id: user?.id })
        .single();
      if (userProfile.data) {
        setProfileData(userProfile.data);
      }
    };
    getInfo();
  }, []);

  const handleUpdateUISettings = async (action: UIStateAction) => {
    const newState = UIStateReducer(state, action);
    setState(newState);
    await supabaseClient
      .from('profiles')
      .update({ settings: newState })
      .match({ id: profileId })
      .single();

    return newState;
  };

  return [state, handleUpdateUISettings];
};
