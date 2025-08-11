import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase/client'

const SessionContext = createContext<{
  session: Session | null
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
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        // router?.invalidate()
      } else if (session) {
        setSession(session)
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return session
}
