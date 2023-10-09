import { API_HEADERS, TAG_FOR_AUTO_TOOT } from '@/src/constants';
import { pascalCase } from 'change-case';

/**
 * @name filteredTags
 * @description Filters and transforms a given array of tags
 * @param {string[]} tags - Array of tags to filter and transform
 * @returns {string} - Transformed tags, joined with a space
 * @example filteredTags(['react','CSS', 'TwitterLike', 'OtterBot', 'instapaper']) // returns '#React #CSS'
 */
const filteredTags = (tags: string[]) => {
  return tags
    .filter((item) => {
      if (
        [
          TAG_FOR_AUTO_TOOT,
          'IFTTT',
          'TwitterLike',
          'OtterBot',
          'instapaper',
        ].includes(item)
      ) {
        return false;
      }
      return true;
    })
    .map((item) =>
      // if the tag is uppercase, return it as is, otherwise convert it to PascalCase
      item.toUpperCase() === item ? `#${item}` : `#${pascalCase(item)}`,
    )
    .join(' ');
};

/**
 * @name similarArrays
 * @description Checks if two arrays contain the same values
 * @param {string[]} xs - The first array
 * @param {string[]} ys - The second array
 * @returns {boolean} - true if both arrays contain the same values
 * @example similarArrays([1, 2], [2, 1]) // true
 */
const similarArrays = (xs: any[], ys: any[]) => {
  const xsu = [...new Set(xs).values()]; // unique values of xs
  const ysu = [...new Set(ys).values()]; // unique values of ys
  return xsu.length != ysu.length ? false : xsu.every((x) => ysu.includes(x));
};

const errorResponse = (error: string, status: number) => {
  return new Response(
    JSON.stringify({
      reason: error,
      error,
      data: null,
    }),
    {
      status,
      headers: API_HEADERS,
    },
  );
};

export async function POST(request: Request) {
  if (request.headers.get('authorization') !== process.env.API_SECRET) {
    return errorResponse('Toot not sent 😞', 418);
  }
  const body = await request.json();
  console.log(`🚀 ~ body`, body);

  // don't continue if the request doesn't have a type or record
  if (!body.type && !body?.record) {
    return errorResponse('Toot not sent 😞', 418);
  }

  // don't continue if the record doesn't have the 'TAG_FOR_AUTO_TOOT' tag
  if (!body.record.tags.includes(TAG_FOR_AUTO_TOOT)) {
    return errorResponse('Toot not sent 😞', 418);
  }

  // don't continue if the record doesn't have a url
  if (!body.record.url) {
    return errorResponse('Toot not sent 😞', 418);
  }

  // Only
  if (body.type === 'UPDATE') {
    if (similarArrays(body.record.tags, body.old_record.tags)) {
      // tags haven't changed, so there's no need to send a toot
      return errorResponse(
        'UPDATE: old and new tags are the same. Toot not sent 😞',
        418,
      );
    } else if (
      // tags might have changed, but the bookmark still has is still the 'TAG_FOR_AUTO_TOOT' tag
      // so there's no need to send a toot
      body.record.tags.includes(TAG_FOR_AUTO_TOOT) &&
      body.old_record.tags.includes(TAG_FOR_AUTO_TOOT)
    ) {
      return errorResponse(
        'UPDATE: this bookmark already had the required tag. Toot not sent 😞',
        418,
      );
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
