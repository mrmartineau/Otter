//
//  SceneDelegate.swift
//  iOS (App)
//
//  Created by Zander Martineau on 08/10/2025.
//

import SwiftUI
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // The app is SwiftUI; there is no storyboard to load.
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = UIHostingController(rootView: RootView())
        self.window = window
        window.makeKeyAndVisible()

        if let url = connectionOptions.urlContexts.first?.url {
            handleURL(url)
        }
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        // Requests are one-shot, so queue the next refresh on the way out.
        BackgroundRefresh.schedule()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        handleURL(url)
    }

    private func handleURL(_ url: URL) {
        guard url.scheme == "otter" else { return }

        switch url.host {
        case "save":
            let bookmarkURL = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first(where: { $0.name == "url" })?.value
            SaveRequestCenter.shared.request(url: bookmarkURL)
        default:
            break
        }
    }

}
