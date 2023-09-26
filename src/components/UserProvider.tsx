'use client';

import { ReactNode, createContext, useContext } from 'react';

import { UserProfile } from '../types/db';

interface UserContextType {
  profile: UserProfile | null;
  id: string | undefined;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const userContext = useContext(UserContext);

  if (!userContext) {
    throw new Error('useUser has to be used within <UserContext.Provider>');
  }

  return userContext;
};

interface UserProviderProps extends UserContextType {
  children: ReactNode;
}

export const UserProvider = ({ children, id, profile }: UserProviderProps) => {
  return (
    <UserContext.Provider value={{ id, profile }}>
      {children}
    </UserContext.Provider>
  );
};
