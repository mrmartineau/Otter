import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { createTitle } from '@/constants'
import { getAdminStatsOptions } from '@/utils/fetching/admin'
import './admin.css'

export const Route = createFileRoute('/_app/admin/')({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: createTitle('adminTitle') }],
  }),
  loader: async (opts) => {
    await opts.context.queryClient.ensureQueryData(getAdminStatsOptions())
  },
})

interface StatProps {
  label: string
  value: ReactNode
  hint?: string
}

const Stat = ({ label, value, hint }: StatProps) => (
  <div className="admin-stat">
    <span className="admin-stat-value">{value}</span>
    <span className="admin-stat-label">{label}</span>
    {hint ? <span className="admin-stat-hint">{hint}</span> : null}
  </div>
)

function RouteComponent() {
  const { data: stats } = useSuspenseQuery(getAdminStatsOptions())
  const fmt = (value: number) => value.toLocaleString()

  return (
    <div className="flow">
      <div className="admin-stat-grid">
        <Stat label="Total users" value={fmt(stats.total_users)} />
        <Stat
          label="Est. MRR"
          value={`$${fmt(stats.estimated_mrr)}`}
          hint="From active Pro subscriptions"
        />
        <Stat label="Pro users" value={fmt(stats.pro_users)} />
        <Stat label="Free users" value={fmt(stats.free_users)} />
        <Stat label="Admins" value={fmt(stats.admin_users)} />
        <Stat label="Total bookmarks" value={fmt(stats.total_bookmarks)} />
        <Stat label="Public bookmarks" value={fmt(stats.public_bookmarks)} />
        <Stat
          label="Bookmarks · 7 days"
          value={fmt(stats.bookmarks_last_7_days)}
        />
        <Stat
          label="Bookmarks · 30 days"
          value={fmt(stats.bookmarks_last_30_days)}
        />
        <Stat label="Signups · 7 days" value={fmt(stats.signups_last_7_days)} />
        <Stat
          label="Signups · 30 days"
          value={fmt(stats.signups_last_30_days)}
        />
      </div>
    </div>
  )
}
