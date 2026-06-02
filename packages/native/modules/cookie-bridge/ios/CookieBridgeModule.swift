import ExpoModulesCore
import Foundation

// Shared App Group identifier. Must match the entitlement on BOTH the main app
// (app.json → ios.entitlements) and the share extension
// (targets/share/expo-target.config.js → entitlements).
private let appGroupId = "group.wtf.zander.otter"

/// Pushes the app's web session cookies into the App Group container so the
/// share extension — which runs in its own sandbox and cannot see the app's
/// default cookie store — can reuse the logged-in session.
public class CookieBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CookieBridge")

    AsyncFunction("syncToAppGroup") { (domain: String, promise: Promise) in
      // `react-native-webview` with `sharedCookiesEnabled` mirrors the
      // WKWebView cookies (including HttpOnly session cookies) into the app's
      // shared HTTPCookieStorage — that's our source. The App Group store is
      // non-optional; if the entitlement is missing, writes simply won't be
      // visible to the extension (nothing to detect here).
      let groupStore = HTTPCookieStorage.sharedCookieStorage(
        forGroupContainerIdentifier: appGroupId
      )

      let cookies = HTTPCookieStorage.shared.cookies ?? []
      var copied = 0
      for cookie in cookies where cookie.domain.contains(domain) {
        groupStore.setCookie(cookie)
        copied += 1
      }
      promise.resolve(copied)
    }
  }
}
