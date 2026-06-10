import { requireNativeModule } from 'expo'

interface CookieBridgeModule {
  /**
   * Copies cookies whose domain contains `domain` from the app's shared
   * `HTTPCookieStorage` into the App Group cookie store, so the share
   * extension (a separate sandbox) can read the logged-in session.
   * Resolves with the number of cookies copied.
   */
  syncToAppGroup(domain: string): Promise<number>
}

// Falls back to a no-op on platforms/builds where the native module is absent
// (e.g. running in an environment without the prebuilt binary), so callers can
// fire-and-forget without guarding.
let nativeModule: CookieBridgeModule | null = null
try {
  nativeModule = requireNativeModule<CookieBridgeModule>('CookieBridge')
} catch {
  nativeModule = null
}

export function syncToAppGroup(domain = 'otter.zander.wtf'): Promise<number> {
  if (!nativeModule) return Promise.resolve(0)
  return nativeModule.syncToAppGroup(domain)
}
