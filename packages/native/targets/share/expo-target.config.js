/**
 * Apple share-extension target, built by `@bacons/apple-targets` during
 * `expo prebuild`. The Swift + Info.plist in this folder are compiled into a
 * native Share Extension that appears in the iOS/iPadOS share sheet.
 *
 * @type {import('@bacons/apple-targets').Config}
 */
module.exports = {
  // Inherits the main app's bundle id with a `.OtterShare` suffix.
  // Keep the deployment target in step with the main app.
  deploymentTarget: '16.0',
  // Shared App Group so the extension can read the session cookies the main
  // app writes into the group container. Must match app.json ios.entitlements.
  entitlements: {
    'com.apple.security.application-groups': ['group.wtf.zander.otter'],
  },
  frameworks: ['WebKit'],
  name: 'Otter Share',
  type: 'share',
}
