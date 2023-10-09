import { TAG_FOR_AUTO_TOOT } from '@/src/constants';
import { errorResponse } from '@/src/utils/fetching/errorResponse';

import { filteredTags, similarArrays } from './utils';

/**
 * /api/toot
 * This endpoint sends toots to 2 Mastodon accounts
 * It uses the `OTTER_API_TOKEN` environment variable to authenticate via an Authorization header token
 */
export async function POST(request: Request) {
  if (request.headers.get('Authorization') !== process.env.OTTER_API_TOKEN) {
    return errorResponse({ reason: 'Not authorised', status: 401 });
  }

  const body = await request.json();

  // don't continue if the request doesn't have a type or record
  if (!body.type && !body?.record) {
    return errorResponse({ reason: 'Toot not sent 😞', status: 418 });
  }

  // don't continue if the record doesn't have the 'TAG_FOR_AUTO_TOOT' tag
  if (!body.record.tags.includes(TAG_FOR_AUTO_TOOT)) {
    return errorResponse({ reason: 'Toot not sent 😞', status: 418 });
  }

  // don't continue if the record doesn't have a url
  if (!body.record.url) {
    return errorResponse({ reason: 'Toot not sent 😞', status: 418 });
  }

  // Only
  if (body.type === 'UPDATE') {
    if (similarArrays(body.record.tags, body.old_record.tags)) {
      // tags haven't changed, so there's no need to send a toot
      return errorResponse({
        reason: 'UPDATE: old and new tags are the same. Toot not sent 😞',
        status: 418,
      });
    } else if (
      // tags might have changed, but the bookmark still has is still the 'TAG_FOR_AUTO_TOOT' tag
      // so there's no need to send a toot
      body.record.tags.includes(TAG_FOR_AUTO_TOOT) &&
      body.old_record.tags.includes(TAG_FOR_AUTO_TOOT)
    ) {
      return errorResponse({
        reason:
          'UPDATE: this bookmark already had the required tag. Toot not sent 😞',
        status: 418,
      });
    }
  }

  const filteredTagsString = filteredTags(body.record.tags);
  const tagsString =
    filteredTagsString.length > 0 ? `${filteredTagsString} •` : '';
  const descriptionString =
    body.record.description.length > 0 ? ` - ${body.record.description}` : '';
  const personalTootStart =
    body.record.type === 'article'
      ? 'I just read this #article - check it out:'
      : `New liked #${body.record.type}:`;

  // send mastodon toot to personal account
  const tootContent = `${personalTootStart} "${body.record.title}"${descriptionString}\n${body.record.url}\n${tagsString} #Otter`;
  console.log(`🚀 ~ tootContent`, tootContent);
  await fetch(
    `https://toot.cafe/api/v1/statuses?access_token=${process.env.PERSONAL_MASTODON_ACCESS_TOKEN}`,
    {
      method: 'POST',
      body: `status=${tootContent}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  // send mastodon toot to bot account
  const botTootContent = `New #${body.record.type}: "${body.record.title}"${descriptionString}\n${body.record.url}\n${filteredTagsString}`;
  console.log(`🚀 ~ botTootContent`, botTootContent);
  await fetch(
    `https://botsin.space/api/v1/statuses?access_token=${process.env.BOT_MASTODON_ACCESS_TOKEN}`,
    {
      method: 'POST',
      body: `status=${botTootContent}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  return new Response('Toots sent!');
}
