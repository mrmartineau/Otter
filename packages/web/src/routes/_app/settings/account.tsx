import type { User } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { CodeBlock } from '@/components/CodeBlock'
import { UpdateInfoForm } from '@/components/UpdateInfoForm'
import { supabase } from '@/utils/supabase/client'

export const Route = createFileRoute('/_app/settings/account')({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: 'Account settings',
      },
    ],
  }),
  loader: async (): Promise<User | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return user
  },
})

function RouteComponent() {
  const user = Route.useLoaderData()

  return (
    <article className="flow">
      <h3>User info</h3>
      Account ID: <CodeBlock>{user?.id}</CodeBlock>
      <h3>Update account</h3>
      <UpdateInfoForm user={user} />
    </article>
  )
}
