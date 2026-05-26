import { CheckIcon } from '@phosphor-icons/react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/Button'
import { Flex } from '@/components/Flex'
import { useUser } from '@/components/UserProvider'
import { BILLING_PLANS, CONTENT, createTitle, type PlanId } from '@/constants'
import {
  getBillingStatusOptions,
  useCheckoutMutation,
  usePortalMutation,
} from '@/utils/fetching/billing'

export const Route = createFileRoute('/_app/settings/billing')({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: createTitle('billingTitle') }],
  }),
  loader: async (opts) => {
    await opts.context.queryClient.ensureQueryData(getBillingStatusOptions())
  },
  validateSearch: (search: Record<string, unknown>): { checkout?: string } => ({
    checkout: typeof search.checkout === 'string' ? search.checkout : undefined,
  }),
})

const formatDate = (iso: string) => format(new Date(iso), 'd MMM yyyy')

function RouteComponent() {
  const search = useSearch({ from: '/_app/settings/billing' })
  const queryClient = useQueryClient()
  const { profile } = useUser()
  const { data: billing } = useSuspenseQuery(getBillingStatusOptions())
  const checkout = useCheckoutMutation()
  const portal = usePortalMutation()
  const celebrated = useRef(false)

  useEffect(() => {
    if (search.checkout !== 'success' || celebrated.current) {
      return
    }
    celebrated.current = true
    toast.success('Payment received — welcome to Pro!')
    // The Stripe webhook updates the plan asynchronously, so refetch shortly.
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    }, 2500)
    return () => clearTimeout(timer)
  }, [search.checkout, queryClient])

  // Admins have full access via their role — there is nothing to bill.
  if (profile?.role === 'admin') {
    return (
      <article className="flow">
        <h3>{CONTENT.billingTitle}</h3>
        <div className="billing-card flow">
          <Flex align="center" gap="2xs">
            <strong>Admin — full access</strong>
            <span className="admin-badge is-pro">Admin</span>
          </Flex>
          <p>
            You have unlimited bookmarks and all AI features as an admin. No
            subscription needed.
          </p>
        </div>
      </article>
    )
  }

  const isPro = billing.plan === 'pro'
  const isComp = billing.plan === 'comp'
  const { quota } = billing
  // Unlimited covers Pro, complimentary plans and admins.
  const unlimited = quota.limit === null
  const limit = quota.limit ?? 0
  const usedPct =
    limit > 0 ? Math.min(100, Math.round((quota.used / limit) * 100)) : 0
  const atLimit = quota.limit !== null && quota.used >= quota.limit
  const planLabel = isPro
    ? 'Pro plan'
    : isComp
      ? 'Pro plan (complimentary)'
      : 'Free plan'

  return (
    <article className="flow">
      <h3>{CONTENT.billingTitle}</h3>

      <div className="billing-card flow">
        <Flex align="center" justify="between" wrap="wrap" gap="xs">
          <Flex align="center" gap="2xs">
            <strong>{planLabel}</strong>
            <span
              className={`admin-badge ${isPro || isComp ? 'is-pro' : ''}`}
            >
              {isPro || isComp ? 'Pro' : 'Free'}
            </span>
          </Flex>
          {isPro ? (
            <Button
              variant="outline"
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
            >
              Manage subscription
            </Button>
          ) : unlimited ? null : (
            <Button
              onClick={() => checkout.mutate()}
              disabled={checkout.isPending}
            >
              Upgrade to Pro
            </Button>
          )}
        </Flex>

        {isPro ? (
          <p>
            {billing.cancel_at_period_end
              ? `Your subscription is set to cancel${
                  billing.current_period_end
                    ? ` on ${formatDate(billing.current_period_end)}`
                    : ''
                }. You keep Pro access until then.`
              : billing.current_period_end
                ? `Your Pro subscription renews on ${formatDate(
                    billing.current_period_end,
                  )}.`
                : 'Your Pro subscription is active.'}
          </p>
        ) : unlimited ? (
          <p>
            {isComp
              ? 'You have full Pro access, complimentary — all Pro features (unlimited bookmarks, AI titles, summaries & classification) at no charge.'
              : 'You have unlimited bookmarks.'}
          </p>
        ) : (
          <div className="flow">
            <Flex justify="between">
              <span>Bookmarks added today</span>
              <strong>
                {quota.used} / {quota.limit}
              </strong>
            </Flex>
            <div className="billing-usage-track">
              <div
                className={`billing-usage-fill ${atLimit ? 'is-full' : ''}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p>
              {atLimit
                ? "You've reached today's free limit. Upgrade to Pro for unlimited bookmarks."
                : `${quota.remaining} more bookmark${
                    quota.remaining === 1 ? '' : 's'
                  } available today.`}
            </p>
          </div>
        )}
      </div>

      <div className="billing-plan-grid">
        {(Object.keys(BILLING_PLANS) as PlanId[]).map((planId) => {
          const plan = BILLING_PLANS[planId]
          const isCurrent = billing.plan === planId

          return (
            <div
              key={planId}
              className={`billing-plan ${isCurrent ? 'is-current' : ''}`}
            >
              <Flex align="center" justify="between">
                <strong>{plan.name}</strong>
                {isCurrent ? (
                  <span className="admin-badge">Current plan</span>
                ) : null}
              </Flex>
              <div>
                <span className="billing-plan-price">{plan.priceLabel}</span>
                {plan.price > 0 ? <span> / month</span> : null}
              </div>
              <ul className="billing-plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <CheckIcon size={16} weight="bold" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {planId === 'pro' && !isPro && !unlimited ? (
                <Button
                  onClick={() => checkout.mutate()}
                  disabled={checkout.isPending}
                >
                  Upgrade to Pro
                </Button>
              ) : null}
            </div>
          )
        })}
      </div>
    </article>
  )
}
