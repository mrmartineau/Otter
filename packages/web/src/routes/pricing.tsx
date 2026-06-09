import { CheckIcon } from '@phosphor-icons/react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import {
  ALLOW_SIGNUP,
  BILLING_ENABLED,
  BILLING_TIERS,
  createTitle,
  ROUTE_HOME,
  ROUTE_SETTINGS_BILLING,
  ROUTE_SIGNIN,
  TIER_DISPLAY_ORDER,
  type TierId,
} from '@/constants'

export const Route = createFileRoute('/pricing')({
  // Pricing targets new signups — hide it when signups or billing are
  // disabled. Billing-off instances are single-tier free, so there is
  // nothing to price.
  beforeLoad: () => {
    if (!BILLING_ENABLED) {
      throw redirect({ to: ROUTE_HOME })
    }
    if (!ALLOW_SIGNUP) {
      throw redirect({ to: ROUTE_SIGNIN })
    }
  },
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
        Otter is free to start. Subscribe monthly or annually, or pay once for
        lifetime access.
      </p>

      <div className="billing-plan-grid">
        {TIER_DISPLAY_ORDER.map((tierId: TierId) => {
          const tier = BILLING_TIERS[tierId]
          const isPaid = tierId !== 'free'
          const ctaLabel =
            tierId === 'free'
              ? 'Get started'
              : tierId === 'lifetime'
                ? 'Buy lifetime'
                : 'Subscribe'

          return (
            <div
              key={tierId}
              className={`billing-plan ${isPaid ? 'is-current' : ''}`}
            >
              <strong>{tier.name}</strong>
              <span>{tier.tagline}</span>
              <div>
                <span className="billing-plan-price">{tier.priceLabel}</span>
                {tier.periodLabel ? <span> {tier.periodLabel}</span> : null}
              </div>
              <ul className="billing-plan-features">
                {tier.features.map((feature) => (
                  <li key={feature}>
                    <CheckIcon size={16} weight="bold" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant={isPaid ? 'default' : 'outline'} asChild>
                <Link to={isPaid ? ROUTE_SETTINGS_BILLING : ROUTE_SIGNIN}>
                  {ctaLabel}
                </Link>
              </Button>
            </div>
          )
        })}
      </div>
    </Container>
  )
}
