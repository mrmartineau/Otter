import { createContext, useContext } from 'react'
import { type AuthSession, authClient } from '../utils/auth/client'

const SessionContext = createContext<{
  session: AuthSession | null
}>({
  session: null,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const session = useSession()

  return (
    <SessionContext.Provider value={{ session }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useAuthContext = () => {
  const context = useContext(SessionContext)

  if (context === undefined) {
    throw new Error('useAuthContext has to be used within <AuthProvider>')
  }

  return context
}

export const useSession = () => {
  const { data: session } = authClient.useSession()

  return session
}
