// Single source of truth for the Otter web app the WebView wraps.
export const OTTER_URL = 'https://otter.zander.wtf'

// Host (and subdomains) that are considered "internal" — these stay inside the
// WebView. A user tap on anything outside this host opens in Safari instead.
export const OTTER_HOST = 'otter.zander.wtf'

// Brand background colour shown behind the WebView before first paint, so a
// cold network request never flashes white.
export const BACKGROUND_COLOR = '#ffffff'

/**
 * True when `url` belongs to Otter (the host itself or any subdomain of it).
 * Auth/OAuth redirects to third-party hosts are handled separately by
 * navigation-type, not by this check.
 */
export function isOtterUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === OTTER_HOST || hostname.endsWith(`.${OTTER_HOST}`)
  } catch {
    // Non-http(s) schemes (mailto:, tel:, etc.) are never "internal".
    return false
  }
}
