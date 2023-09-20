import { Database } from '@/src/types/supabase'
import { getDbMetadata } from '@/src/utils/fetching/meta'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { ReactNode, ComponentPropsWithoutRef } from 'react'
// import { clsx } from 'clsx'
// import 'Layout.styles.css'

interface LayoutProps extends ComponentPropsWithoutRef<'div'> {
  children?: ReactNode
}

export default async function AppLayout({ children }: LayoutProps) {
  const supabaseClient = createServerComponentClient<Database>({ cookies })
  const data = await getDbMetadata(supabaseClient)
  console.log(`🚀 ~ data:`, data)

  return (
    <div>
      <header>Otter</header>
      {children}
    </div>
  )
}
