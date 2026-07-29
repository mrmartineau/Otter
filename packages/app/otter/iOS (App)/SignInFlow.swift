//
//  SignInFlow.swift
//  iOS (App)
//
//  The interactive half of the OAuth flow. Lives in the app target because
//  `ASWebAuthenticationSession` needs a window to present from.
//

import AuthenticationServices
import UIKit

@MainActor
final class SignInFlow: NSObject, ASWebAuthenticationPresentationContextProviding {
    /// Held for the duration of the flow so ARC doesn't tear the session down.
    private var session: ASWebAuthenticationSession?

    func signIn(instanceURL: URL) async throws -> OtterCredentials {
        let clientID = try await OtterOAuth.registerClient(instanceURL: instanceURL)
        let pkce = OtterOAuth.PKCE.generate()
        let state = OtterOAuth.randomURLSafeString(byteCount: 16)

        guard let authorizationURL = OtterOAuth.authorizationURL(
            instanceURL: instanceURL,
            clientID: clientID,
            state: state,
            codeChallenge: pkce.challenge
        ) else {
            throw OtterError.invalidInstanceURL
        }

        let callback = try await authenticate(url: authorizationURL)
        let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
        let value = { (name: String) in items.first { $0.name == name }?.value }

        if let error = value("error") {
            throw OtterError.server(value("error_description") ?? error)
        }

        guard let code = value("code"), value("state") == state else {
            throw OtterError.invalidResponse
        }

        let token = try await OtterOAuth.exchangeCode(
            code,
            verifier: pkce.verifier,
            clientID: clientID,
            instanceURL: instanceURL
        )

        return OtterCredentials(
            instanceURL: instanceURL,
            clientID: clientID,
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: token.expiresAt
        )
    }

    private func authenticate(url: URL) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: OtterOAuth.callbackScheme
            ) { callbackURL, error in
                if let callbackURL {
                    continuation.resume(returning: callbackURL)
                    return
                }

                let cancelled = (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin
                continuation.resume(throwing: cancelled ? OtterError.signInCancelled : (error ?? OtterError.invalidResponse))
            }

            session.presentationContextProvider = self
            // Reuse the Safari session so an already signed-in browser doesn't
            // ask for the password again.
            session.prefersEphemeralWebBrowserSession = false
            self.session = session

            if !session.start() {
                self.session = nil
                continuation.resume(throwing: OtterError.server("Could not start sign in."))
            }
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let window = scenes
            .flatMap(\.windows)
            .first { $0.isKeyWindow } ?? scenes.first?.windows.first

        return window ?? ASPresentationAnchor()
    }
}
