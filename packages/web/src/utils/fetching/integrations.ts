import {
	queryOptions,
	useMutation,
	useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../supabase/client'

export const getIntegrationOptions = (userId: string) => {
	return queryOptions({
		queryFn: async () => {
			const { data, error } = await supabase
				.from('user_integrations')
				.select(
					'user_id, bluesky_enabled, bluesky_handle, bluesky_last_error, created_at, updated_at',
				)
				.match({ user_id: userId })
				.single()

			// If no row exists yet, return null (user hasn't configured integrations)
			if (error?.code === 'PGRST116') {
				return null
			}
			if (error) {
				throw error
			}
			return data
		},
		queryKey: ['userIntegrations', userId],
	})
}

interface UpsertBlueskyParams {
	userId: string
	handle: string
	appPassword: string
	enabled: boolean
}

export const useUpsertBlueskyMutation = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			userId,
			handle,
			appPassword,
			enabled,
		}: UpsertBlueskyParams) => {
			const { error } = await supabase.from('user_integrations').upsert(
				{
					user_id: userId,
					bluesky_handle: handle,
					bluesky_app_password: appPassword,
					bluesky_enabled: enabled,
					bluesky_last_error: null,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: 'user_id' },
			)

			if (error) {
				throw error
			}
		},
		onError: (error) => {
			toast.error(`Failed to save Bluesky settings: ${error.message}`)
		},
		onSuccess: () => {
			toast.success('Bluesky settings saved')
		},
		onSettled: async (_, __, variables) => {
			await queryClient.invalidateQueries({
				queryKey: ['userIntegrations', variables.userId],
			})
		},
	})
}

export const useToggleBlueskyMutation = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			userId,
			enabled,
		}: { userId: string; enabled: boolean }) => {
			const { error } = await supabase
				.from('user_integrations')
				.update({
					bluesky_enabled: enabled,
					bluesky_last_error: null,
					updated_at: new Date().toISOString(),
				})
				.match({ user_id: userId })

			if (error) {
				throw error
			}
		},
		onError: (error) => {
			toast.error(`Failed to update Bluesky: ${error.message}`)
		},
		onSettled: async (_, __, variables) => {
			await queryClient.invalidateQueries({
				queryKey: ['userIntegrations', variables.userId],
			})
		},
	})
}
