//
//  OtterCredentials.swift
//  Shared (Core)
//

import Foundation

/// Everything needed to talk to an Otter instance: where it lives, the OAuth
/// client this device registered itself as, and the current token pair.
nonisolated struct OtterCredentials: Codable, Equatable {
    var instanceURL: URL
    var clientID: String
    var accessToken: String
    var refreshToken: String?
    var expiresAt: Date?

    /// Treat tokens as expired a minute early so in-flight requests don't race
    /// the expiry.
    var isExpired: Bool {
        guard let expiresAt else { return false }
        return expiresAt.timeIntervalSinceNow < 60
    }
}

/// Keychain-backed storage, shared between the app and the share extension.
nonisolated enum OtterCredentialStore {
    private static let keychain = Keychain(
        service: "zander.martineau.otter.oauth",
        accessGroup: otterKeychainAccessGroup
    )
    private static let account = "credentials"

    static func load() -> OtterCredentials? {
        guard let data = keychain.read(account: account) else { return nil }
        return try? JSONDecoder().decode(OtterCredentials.self, from: data)
    }

    static func save(_ credentials: OtterCredentials) {
        guard let data = try? JSONEncoder().encode(credentials) else { return }
        keychain.write(data, account: account)
    }

    static func clear() {
        keychain.delete(account: account)
    }
}
