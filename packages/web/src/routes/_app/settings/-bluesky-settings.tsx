import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/Button'
import { FormGroup } from '@/components/FormGroup'
import { Input } from '@/components/Input'
import { Link } from '@/components/Link'
import { Text } from '@/components/Text'
import {
	getIntegrationOptions,
	useToggleBlueskyMutation,
	useUpsertBlueskyMutation,
} from '@/utils/fetching/integrations'

interface BlueskyFormValues {
	handle: string
	appPassword: string
	postPrefix: string
	postSuffix: string
}

interface BlueskySettingsProps {
	userId: string
}

export const BlueskySettings = ({ userId }: BlueskySettingsProps) => {
	const { data: integration, isLoading } = useQuery(
		getIntegrationOptions(userId),
	)
	const upsertMutation = useUpsertBlueskyMutation()
	const toggleMutation = useToggleBlueskyMutation()
	const [showPassword, setShowPassword] = useState(false)

	const isConfigured = !!integration?.bluesky_handle
	const isEnabled = !!integration?.bluesky_enabled

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<BlueskyFormValues>({
		values: {
			handle: integration?.bluesky_handle ?? '',
			appPassword: '',
			postPrefix: integration?.bluesky_post_prefix ?? '',
			postSuffix: integration?.bluesky_post_suffix ?? '',
		},
	})

	const handleSave = (values: BlueskyFormValues) => {
		upsertMutation.mutate({
			userId,
			handle: values.handle,
			appPassword: values.appPassword,
			enabled: true,
			postPrefix: values.postPrefix,
			postSuffix: values.postSuffix,
		})
		setShowPassword(false)
	}

	const handleToggle = () => {
		toggleMutation.mutate({ userId, enabled: !isEnabled })
	}

	if (isLoading) {
		return <Text>Loading…</Text>
	}

	return (
		<div className="flex flex-col gap-s">
			<Text>
				Automatically post to Bluesky when a bookmark is made public. Requires
				an{' '}
				<Link
					href="https://bsky.app/settings/app-passwords"
					variant="accent"
				>
					App Password
				</Link>
				.
			</Text>

			{integration?.bluesky_last_error ? (
				<div className="rounded bg-destructive/10 p-s text-step--1 text-destructive">
					{integration.bluesky_last_error}
				</div>
			) : null}

			<form
				onSubmit={handleSubmit(handleSave)}
				noValidate
				className="flex flex-col gap-s"
			>
				<FormGroup
					label="Bluesky handle"
					name="handle"
					error={errors.handle?.message}
					note="e.g. yourname.bsky.social"
				>
					<Input
						id="handle"
						type="text"
						placeholder="yourname.bsky.social"
						{...register('handle', {
							required: 'Handle is required',
						})}
					/>
				</FormGroup>

				<FormGroup
					label="App Password"
					name="appPassword"
					error={errors.appPassword?.message}
					note={
						isConfigured && !showPassword
							? 'Password is saved. Enter a new one to change it.'
							: undefined
					}
				>
					{isConfigured && !showPassword ? (
						<div className="flex items-center gap-s">
							<Input
								id="appPassword"
								type="password"
								value="••••••••••••"
								disabled
							/>
							<Button
								type="button"
								variant="outline"
								size="s"
								onClick={() => setShowPassword(true)}
							>
								Change
							</Button>
						</div>
					) : (
						<Input
							id="appPassword"
							type="password"
							placeholder="xxxx-xxxx-xxxx-xxxx"
							{...register('appPassword', {
								required: isConfigured
									? false
									: 'App Password is required',
							})}
							autoComplete="off"
						/>
					)}
				</FormGroup>

				<FormGroup
					label="Post prefix"
					name="postPrefix"
					note="Text added before each post"
				>
					<Input
						id="postPrefix"
						type="text"
						placeholder="e.g. 🔖"
						{...register('postPrefix')}
					/>
				</FormGroup>

				<FormGroup
					label="Post suffix"
					name="postSuffix"
					note="Text added after each post"
				>
					<Input
						id="postSuffix"
						type="text"
						placeholder="e.g. #bookmarks"
						{...register('postSuffix')}
					/>
				</FormGroup>

				<div className="flex items-center gap-s">
					<Button
						type="submit"
						disabled={upsertMutation.isPending}
					>
						Save
					</Button>
					{isConfigured ? (
						<Button
							type="button"
							variant={isEnabled ? 'outline' : 'default'}
							onClick={handleToggle}
							disabled={toggleMutation.isPending}
						>
							{isEnabled ? 'Disable' : 'Enable'}
						</Button>
					) : null}
				</div>
			</form>
		</div>
	)
}
