//
//  OtterCredentials.swift
//  Shared (Core)
//

import Foundation
import Security

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

    /// Reports whether the credentials were persisted. After a token rotation a
    /// failed write is not recoverable — the instance has already retired the
    /// previous refresh token — so the caller logs it rather than discovering it
    /// a day later as a surprise sign-out.
    @discardableResult
    static func save(_ credentials: OtterCredentials) -> Bool {
        guard let data = try? JSONEncoder().encode(credentials) else { return false }
        return keychain.write(data, account: account)
    }

    static func clear() {
        keychain.delete(account: account)
    }
}

/// A mutex over the refresh-token grant, shared by every process that holds the
/// credentials.
///
/// Otter's OAuth provider rotates refresh tokens: each refresh retires the token
/// it was given and issues a new one. Presenting a retired token is read as
/// theft, and the response is to delete *every* refresh token this client holds
/// — which signs the device out of the app and the share extension at once, up
/// to an access token's lifetime later, long after whatever raced.
///
/// The app and the share extension are separate processes with separate copies
/// of the credentials, so nothing in-process can prevent both spending the same
/// token. The keychain is the one store they share, and `SecItemAdd` fails with
/// `errSecDuplicateItem` rather than overwriting, which makes it a
/// compare-and-swap both processes can agree on.
nonisolated enum OtterRefreshLock {
    private static let keychain = Keychain(
        service: "zander.martineau.otter.oauth.lock",
        accessGroup: otterKeychainAccessGroup
    )
    private static let account = "refresh"

    /// iOS kills the share extension the moment it finishes its request, which
    /// can happen mid-refresh. A holder older than this is treated as gone, so
    /// one dead extension can't lock the app out permanently.
    private static let staleAfter: TimeInterval = 30

    private static let pollInterval: UInt64 = 150_000_000

    /// Waits for the lock, up to `timeout`. A `false` return means it never came
    /// free; the caller refreshes anyway, because a client that can never
    /// refresh is stranded for good, which is worse than the race this guards
    /// against. Callers re-read the shared credentials either way.
    static func acquire(timeout: TimeInterval = 20) async -> Bool {
        let deadline = Date(timeIntervalSinceNow: timeout)

        while true {
            let status = claim()

            if status == errSecSuccess {
                return true
            }

            // Refused for some reason other than the lock being taken — a
            // missing entitlement, say. There is nothing to wait for, and
            // waiting would block every refresh this install ever makes.
            guard status == errSecDuplicateItem else { return false }

            if let heldSince = heldSince(), Date().timeIntervalSince(heldSince) > staleAfter {
                release()

                if claim() == errSecSuccess {
                    return true
                }
            }

            guard Date() < deadline else { return false }

            try? await Task.sleep(nanoseconds: pollInterval)
        }
    }

    static func release() {
        keychain.delete(account: account)
    }

    /// Stamped with the time it was taken, so a lock left behind by a killed
    /// process can be recognised as abandoned.
    private static func claim() -> OSStatus {
        let stamp = String(Date().timeIntervalSince1970)
        return keychain.add(Data(stamp.utf8), account: account)
    }

    private static func heldSince() -> Date? {
        guard let data = keychain.read(account: account),
              let text = String(data: data, encoding: .utf8),
              let seconds = TimeInterval(text)
        else {
            return nil
        }

        return Date(timeIntervalSince1970: seconds)
    }
}
