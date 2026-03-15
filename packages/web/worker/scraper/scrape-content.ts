import type { HonoRequest } from 'hono'
import { xtract } from '../xtractr/index'
import {
  generateErrorJSONResponse,
  generateJSONResponse,
} from './json-response'

export const handleScrapeContent = async (request: HonoRequest) => {
  const searchParams = new URL(request.url).searchParams
  let url = searchParams.get('url')

  if (!url) {
    return generateErrorJSONResponse(
      new Error(
        'Please provide a `url` query parameter, e.g. ?url=https://example.com',
      ),
    )
  }

  if (!url.match(/^[a-zA-Z]+:\/\//)) {
    url = `https://${url}`
  }

  try {
    const result = await xtract(url)
    return generateJSONResponse(result)
  } catch (error) {
    return generateErrorJSONResponse(error, url)
  }
}
