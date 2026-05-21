import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/Button'
import { Flex } from '@/components/Flex'
import { createTitle } from '@/constants'
import type { AdminUser } from '@/types/db'
import {
  getAdminUsersOptions,
  useUpdateUserMutation,
} from '@/utils/fetching/admin'
import './admin.css'

export const Route = createFileRoute('/_app/admin/users')({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: createTitle('adminUsersTitle') }],
  }),
  loader: async (opts) => {
    await opts.context.queryClient.ensureQueryData(getAdminUsersOptions())
  },
})

function UserRow({ user }: { user: AdminUser }) {
  const update = useUpdateUserMutation()
  const [override, setOverride] = useState(
    user.daily_bookmark_limit_override?.toString() ?? '',
  )

  const currentOverride = user.daily_bookmark_limit_override
  const parsedOverride = override.trim() === '' ? null : Number(override)
  const overrideChanged = parsedOverride !== currentOverride

  const saveOverride = () => {
    if (
      parsedOverride !== null &&
      (!Number.isInteger(parsedOverride) || parsedOverride < 0)
    ) {
      toast.error('Enter a whole number of 0 or more')
      return
    }
    update.mutate({
      daily_bookmark_limit_override: parsedOverride,
      id: user.id,
    })
  }

  const toggleRole = () => {
    update.mutate({
      id: user.id,
      role: user.role === 'admin' ? 'user' : 'admin',
    })
  }

  return (
    <tr>
      <td>
        <div>{user.name || user.username || '—'}</div>
        <div className="admin-user-email">{user.email}</div>
      </td>
      <td>
        <span className={`admin-badge ${user.plan === 'pro' ? 'is-pro' : ''}`}>
          {user.plan}
        </span>
        {user.plan === 'pro' ? (
          <div className="admin-user-email">{user.subscription_status}</div>
        ) : null}
      </td>
      <td>
        <Flex align="center" gap="2xs">
          <span
            className={`admin-badge ${user.role === 'admin' ? 'is-admin' : ''}`}
          >
            {user.role}
          </span>
          <Button
            variant="ghost"
            size="2xs"
            onClick={toggleRole}
            disabled={update.isPending}
          >
            {user.role === 'admin' ? 'Revoke' : 'Make admin'}
          </Button>
        </Flex>
      </td>
      <td>{user.bookmark_count.toLocaleString()}</td>
      <td>
        <Flex align="center" gap="2xs">
          <input
            className="admin-override-input"
            inputMode="numeric"
            placeholder="default"
            value={override}
            onChange={(event) => setOverride(event.target.value)}
          />
          {overrideChanged ? (
            <Button
              variant="outline"
              size="2xs"
              onClick={saveOverride}
              disabled={update.isPending}
            >
              Save
            </Button>
          ) : null}
        </Flex>
      </td>
      <td>{format(new Date(user.created_at), 'd MMM yyyy')}</td>
    </tr>
  )
}

function RouteComponent() {
  const { data: users } = useSuspenseQuery(getAdminUsersOptions())

  return (
    <div className="flow">
      <p>
        {users.length} user{users.length === 1 ? '' : 's'}. The override sets a
        custom daily bookmark limit for a free user — leave blank for the
        default.
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Role</th>
              <th>Bookmarks</th>
              <th>Daily limit</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
