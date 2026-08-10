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

    enum Outcome {
        /// Held, and tagged with the owner that must be handed back to `release`.
        case acquired(owner: String)
        /// Someone else is part-way through a rotation. Whatever they produce
        /// lands in the keychain, so the caller should ask again rather than
        /// spend a token that is about to be retired.
        case busy
        /// The keychain can't provide a lock at all. Refreshing unlocked risks a
        /// race; never refreshing strands the client for good, so the caller
        /// goes ahead.
        case unavailable
    }

    /// A holder records who it is as well as when it started, so a lock can only
    /// ever be released or broken by someone who has looked at whose it is.
    private struct Holder {
        let owner: String
        let takenAt: Date

        var encoded: Data {
            Data("\(owner)|\(takenAt.timeIntervalSince1970)".utf8)
        }

        init(owner: String, takenAt: Date) {
            self.owner = owner
            self.takenAt = takenAt
        }

        init?(_ data: Data) {
            guard let text = String(data: data, encoding: .utf8) else { return nil }

            let parts = text.split(separator: "|", maxSplits: 1)

            guard parts.count == 2, let seconds = TimeInterval(parts[1]) else { return nil }

            owner = String(parts[0])
            takenAt = Date(timeIntervalSince1970: seconds)
        }
    }

    static func acquire(timeout: TimeInterval = 20) async -> Outcome {
        let deadline = Date(timeIntervalSinceNow: timeout)

        while true {
            let owner = OtterOAuth.randomURLSafeString(byteCount: 16)
            let status = claim(owner: owner)

            if status == errSecSuccess {
                return .acquired(owner: owner)
            }

            // Refused for some reason other than the lock being taken — a
            // missing entitlement, say. There is nothing to wait for, and
            // waiting would block every refresh this install ever makes.
            guard status == errSecDuplicateItem else { return .unavailable }

            if let holder = current(), isAbandoned(holder) {
                // Abandoned by a process iOS killed mid-refresh. Break it — but
                // only if it is still the same holder we just judged dead.
                release(owner: holder.owner)

                if claim(owner: owner) == errSecSuccess {
                    return .acquired(owner: owner)
                }
            }

            guard Date() < deadline else { return .busy }

            try? await Task.sleep(nanoseconds: pollInterval)
        }
    }

    /// Releases the lock only if it is still ours. A refresh that outran
    /// `staleAfter` has had its lock broken and reclaimed by someone else, and
    /// deleting *their* lock on the way out would let a third process in while
    /// they are mid-rotation — the very race this guards against.
    static func release(owner: String) {
        guard current()?.owner == owner else { return }

        keychain.delete(account: account)
    }

    /// A holder is written off once it has had far longer than a refresh needs,
    /// or once its timestamp is in the future — which means the clock moved
    /// backwards under it, and waiting on `staleAfter` would never elapse.
    private static func isAbandoned(_ holder: Holder) -> Bool {
        let age = Date().timeIntervalSince(holder.takenAt)

        return age > staleAfter || age < 0
    }

    private static func claim(owner: String) -> OSStatus {
        let holder = Holder(owner: owner, takenAt: Date())
        return keychain.add(holder.encoded, account: account)
    }

    private static func current() -> Holder? {
        guard let data = keychain.read(account: account) else { return nil }

        return Holder(data)
    }
}
