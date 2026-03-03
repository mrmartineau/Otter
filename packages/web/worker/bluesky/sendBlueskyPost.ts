import { env } from 'cloudflare:workers'
import { strifx, when } from '@mrmartineau/strifx'
import { AtpAgent, RichText } from '@atproto/api'
import type { HonoRequest } from 'hono'
import { errorResponse } from '@/utils/fetching/errorResponse'
import { filteredTags } from '@/utils/filteredTags'
import { createServiceClient } from '../supabase/serviceClient'

/**
 * POST /api/bluesky
 * Called by a Supabase webhook when a bookmark is inserted or updated.
 * Posts to Bluesky if the bookmark is newly public and the user has Bluesky enabled.
 */
export const sendBlueskyPost = async (request: HonoRequest) => {
	const webhookSecret = request.header('x-otter-webhook-secret')
	// @ts-expect-error - env typing
	if (!webhookSecret || webhookSecret !== env.WEBHOOK_SECRET) {
		return errorResponse({
			reason: 'Invalid webhook secret',
			status: 401,
		})
	}

	const body = await request.json()

	if (!body.type || !body?.record) {
		return errorResponse({
			reason: 'Bluesky post not sent: missing type or record',
			status: 400,
		})
	}

	// Only post if the bookmark is public and has a URL
	if (body.record.public === false || !body.record.url) {
		return errorResponse({
			reason: 'Bluesky post not sent: bookmark is not public or has no URL',
			status: 200,
		})
	}

	// For UPDATEs, only post if the bookmark was just made public
	if (body.type === 'UPDATE') {
		if (body.record.public === true && body.old_record.public === true) {
			return errorResponse({
				reason: 'Bluesky post not sent: bookmark was already public',
				status: 200,
			})
		}
	}

	// Fetch the user's Bluesky integration settings
	const client = createServiceClient()
	const { data: integration, error: integrationError } = await client
		.from('user_integrations')
		.select('*')
		.match({ user_id: body.record.user })
		.single()

	if (integrationError || !integration) {
		return errorResponse({
			reason: 'Bluesky post not sent: no integration settings found',
			status: 200,
		})
	}

	if (
		!integration.bluesky_enabled ||
		!integration.bluesky_handle ||
		!integration.bluesky_app_password
	) {
		return errorResponse({
			reason: 'Bluesky post not sent: integration not enabled or configured',
			status: 200,
		})
	}

	// Check idempotency: don't post if already posted for this bookmark
	if (body.record.bluesky_post_uri) {
		return errorResponse({
			reason: 'Bluesky post not sent: already posted',
			status: 200,
		})
	}

	try {
		const agent = new AtpAgent({ service: 'https://bsky.social' })
		await agent.login({
			identifier: integration.bluesky_handle,
			password: integration.bluesky_app_password,
		})

		// Compose the post text
		const filteredTagsString = filteredTags(body.record.tags ?? [])
		const postText = strifx`${when(integration.bluesky_post_prefix, { suffix: ' ' })}${body.record.title ?? ''}${when(body.record.description, { prefix: ' — ' })}${when(filteredTagsString, { test: (v: string) => v.length > 0, prefix: '\n' })}${when(integration.bluesky_post_suffix, { prefix: '\n' })}`

		// Parse rich text for facets (links, mentions, hashtags)
		const richText = new RichText({ text: postText })
		await richText.detectFacets(agent)

		// Build the embed with bookmark metadata
		const embed: {
			$type: string
			external: {
				uri: string
				title: string
				description: string
				thumb?: unknown
			}
		} = {
			$type: 'app.bsky.embed.external',
			external: {
				uri: body.record.url,
				title: body.record.title ?? '',
				description: body.record.description ?? '',
			},
		}

		// Upload thumbnail if the bookmark has an image
		if (body.record.image) {
			try {
				const imageResponse = await fetch(body.record.image)
				if (imageResponse.ok) {
					const imageBuffer = await imageResponse.arrayBuffer()
					const contentType =
						imageResponse.headers.get('content-type') ?? 'image/jpeg'
					const { data: blobData } = await agent.uploadBlob(
						new Uint8Array(imageBuffer),
						{ encoding: contentType },
					)
					embed.external.thumb = blobData.blob
				}
			} catch (imageError) {
				// Continue without thumbnail
				console.error('Failed to upload thumbnail:', imageError)
			}
		}

		const response = await agent.post({
			text: richText.text,
			facets: richText.facets,
			embed,
		})

		// Store the post URI on the bookmark for idempotency
		await client
			.from('bookmarks')
			.update({ bluesky_post_uri: response.uri })
			.match({ id: body.record.id })

		return new Response(
			JSON.stringify({ success: true, uri: response.uri }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		)
	} catch (error) {
		console.error('Bluesky post failed:', error)

		const isAuthError =
			error instanceof Error &&
			(error.message.includes('Authentication') ||
				error.message.includes('Invalid identifier or password'))

		// Disable integration on auth errors so the user sees it in settings
		if (isAuthError) {
			await client
				.from('user_integrations')
				.update({
					bluesky_enabled: false,
					bluesky_last_error: 'Authentication failed. Please check your handle and app password.',
				})
				.match({ user_id: body.record.user })
		}

		return errorResponse({
			reason: `Bluesky post failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			status: 500,
		})
	}
}
