//
//  OtterAppModel.swift
//  iOS (App)
//
//  Owns auth state. Bookmark lists live in `BookmarkFeedModel`.
//

import Combine
import Foundation

@MainActor
final class OtterAppModel: ObservableObject {
    /// Default for the sign-in field; any Otter instance works.
    static let defaultInstance = "https://otter.zander.wtf"

    @Published var isRestoring = true
    @Published var isSignedIn = false
    /// The sign-in sheet, shown the first time something needs an account.
    @Published var isSignInPresented = false

    @Published var instanceText = OtterAppModel.defaultInstance
    @Published var isSigningIn = false
    @Published var signInError: String?

    /// Changing this rebuilds the main feed, e.g. after saving a bookmark.
    @Published var feedReloadToken = UUID()

    private let signInFlow = SignInFlow()

    init() {
        // A failed token refresh clears the keychain from deep inside a request,
        // so listen for it rather than checking on every screen.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleSignedOutNotification),
            name: .otterSignedOut,
            object: nil
        )
    }
    
    deinit {
        NotificationCenter.default.removeObserver(
            self,
            name: .otterSignedOut,
            object: nil
        )
    }

    @objc private func handleSignedOutNotification() {
        // Ensure updates happen on the main actor
        Task { @MainActor in
            self.isSignedIn = false
        }
    }

    // MARK: - Auth

    func restore() async {
        if let credentials = await OtterClient.shared.credentials() {
            instanceText = credentials.instanceURL.absoluteString
            isSignedIn = true
        }

        isRestoring = false
    }

    func signIn() async {
        guard let instanceURL = OtterOAuth.normalizeInstanceURL(instanceText) else {
            signInError = OtterError.invalidInstanceURL.localizedDescription
            return
        }

        isSigningIn = true
        signInError = nil

        do {
            let credentials = try await signInFlow.signIn(instanceURL: instanceURL)
            await OtterClient.shared.store(credentials)
            isSigningIn = false
            feedReloadToken = UUID()
            isSignedIn = true
            isSignInPresented = false
        } catch OtterError.signInCancelled {
            isSigningIn = false
        } catch {
            isSigningIn = false
            signInError = error.localizedDescription
        }
    }

    func signOut() async {
        await OtterClient.shared.signOut()
        isSignedIn = false
    }

    func reloadFeed() {
        feedReloadToken = UUID()
    }
}

