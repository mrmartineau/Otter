import { CheckIcon } from '@phosphor-icons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import {
  BILLING_PLANS,
  createTitle,
  type PlanId,
  ROUTE_SETTINGS_BILLING,
  ROUTE_SIGNIN,
} from '@/constants'
import './_app/settings/billing.css'

export const Route = createFileRoute('/pricing')({
  component: Pricing,
  head: () => ({
    meta: [{ title: createTitle('pricingTitle') }],
  }),
})

function Pricing() {
  return (
    <Container className="py-l flow">
      <h1>Simple pricing</h1>
      <p>
        Otter is free to start. Upgrade to Pro whenever you need to save without
        limits.
      </p>

      <div className="billing-plan-grid">
        {(Object.keys(BILLING_PLANS) as PlanId[]).map((planId) => {
          const plan = BILLING_PLANS[planId]
          const isPro = planId === 'pro'

          return (
            <div
              key={planId}
              className={`billing-plan ${isPro ? 'is-current' : ''}`}
            >
              <strong>{plan.name}</strong>
              <span>{plan.tagline}</span>
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
              <Button variant={isPro ? 'default' : 'outline'} asChild>
                <Link to={isPro ? ROUTE_SETTINGS_BILLING : ROUTE_SIGNIN}>
                  {isPro ? 'Get Pro' : 'Get started'}
                </Link>
              </Button>
            </div>
          )
        })}
      </div>
    </Container>
  )
}
