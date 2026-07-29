//
//  AppDelegate.swift
//  iOS (App)
//
//  Created by Zander Martineau on 08/10/2025.
//

import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Start listening for save-bookmark requests (app intents, otter:// URLs)
        // before any scene — and therefore any SwiftUI view — exists.
        _ = SaveRequestCenter.shared

        // Must happen before the app finishes launching.
        BackgroundRefresh.register()
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

}
