import { queryOptions, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { BillingStatus } from '@/types/db'

interface ApiResponse<T> {
  data?: T
  error?: string
  reason?: string
}

export const getBillingStatus = async (): Promise<BillingStatus> => {
  const response = await fetch('/api/billing', { credentials: 'include' })
  const body = (await response.json()) as ApiResponse<BillingStatus>

  if (!response.ok || !body.data) {
    throw new Error(body.error || body.reason || 'Could not load billing')
  }

  return body.data
}

export const getBillingStatusOptions = () =>
  queryOptions({
    queryFn: getBillingStatus,
    queryKey: ['billing'],
    staleTime: 5 * 1000,
  })

/** POSTs to a billing endpoint that returns a Stripe-hosted URL. */
const requestBillingUrl = async (path: string): Promise<string> => {
  const response = await fetch(path, {
    credentials: 'include',
    method: 'POST',
  })
  const body = (await response.json()) as ApiResponse<{ url: string }>

  if (!response.ok || !body.data?.url) {
    throw new Error(body.error || body.reason || 'Request failed')
  }

  return body.data.url
}

/** Starts Stripe Checkout and redirects the browser to it. */
export const useCheckoutMutation = () =>
  useMutation({
    mutationFn: () => requestBillingUrl('/api/billing/checkout'),
    onError: (error: Error) => toast.error(error.message),
    onSuccess: (url) => {
      window.location.href = url
    },
  })

/** Opens the Stripe Billing Portal and redirects the browser to it. */
export const usePortalMutation = () =>
  useMutation({
    mutationFn: () => requestBillingUrl('/api/billing/portal'),
    onError: (error: Error) => toast.error(error.message),
    onSuccess: (url) => {
      window.location.href = url
    },
  })
