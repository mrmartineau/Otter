import urlJoin from 'proper-url-join'

/**
 * Joins a URL domain with a path suffix if the suffix starts with a forward slash
 * @param url - The base URL to extract the domain from
 * @param suffix - The path or URL suffix to potentially join with the domain
 * @returns If suffix starts with '/' and there's a valid domain, returns the joined URL. Otherwise returns the suffix as-is.
 * @example
 * fullPath('https://example.com', '/path') // Returns 'https://example.com/path'
 * fullPath('https://example.com', 'path') // Returns 'path'
 * fullPath('', '/path') // Returns '/path'
 */
export const fullPath = (url: string, suffix: string) => {
  const domain = url ? new URL(url).origin : null
  return suffix?.charAt(0) === '/' && domain ? urlJoin(domain, suffix) : suffix
}
