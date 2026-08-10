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

    /// Counts rotations of this grant, so two copies can be ordered without
    /// reading anything into their expiry dates. The expiry only ranks
    /// rotations while the instance's `OAUTH_ACCESS_TOKEN_TTL` holds still, and
    /// lowering it between two refreshes would otherwise make the newer token
    /// look like the older one.
    ///
    /// Optional so credentials written before this existed still decode; a pair
    /// that predates it falls back to comparing expiries.
    var rotation: Int?

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

    /// A lock is only released explicitly while we can still prove nobody was
    /// entitled to break it — comfortably inside `staleAfter`, since the check
    /// and the delete can't be made one atomic keychain operation. Past this
    /// point the lease is simply left to expire, which costs a few seconds and
    /// can't take someone else's lock down with it.
    private static let releaseBefore: TimeInterval = 25

    private static let pollInterval: UInt64 = 150_000_000

    enum Outcome {
        /// Held, along with the lease that must be handed back to `release`.
        case acquired(lease: Lease)
        /// Someone else is part-way through a rotation. Whatever they produce
        /// lands in the keychain, so the caller should ask again rather than
        /// spend a token that is about to be retired.
        case busy
        /// The keychain can't provide a lock at all. Refreshing unlocked risks a
        /// race; never refreshing strands the client for good, so the caller
        /// goes ahead.
        case unavailable
    }

    /// Who holds the lock, and since when — so a lock can only be released or
    /// broken by someone who has looked at whose it is and how old it is.
    struct Lease {
        let owner: String
        let takenAt: Date

        var age: TimeInterval {
            Date().timeIntervalSince(takenAt)
        }

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
            let lease = Lease(
                owner: OtterOAuth.randomURLSafeString(byteCount: 16),
                takenAt: Date()
            )
            let status = keychain.add(lease.encoded, account: account)

            if status == errSecSuccess {
                return .acquired(lease: lease)
            }

            // Refused for some reason other than the lock being taken — a
            // missing entitlement, say. There is nothing to wait for, and
            // waiting would block every refresh this install ever makes.
            guard status == errSecDuplicateItem else { return .unavailable }

            if let held = current(), isAbandoned(held) {
                // Left behind by a process iOS killed mid-refresh.
                breakLease(held)

                if keychain.add(lease.encoded, account: account) == errSecSuccess {
                    return .acquired(lease: lease)
                }
            }

            guard Date() < deadline else { return .busy }

            try? await Task.sleep(nanoseconds: pollInterval)
        }
    }

    /// Releases the lock, but only while the lease demonstrably still belongs to
    /// us.
    ///
    /// The owner check and the delete can't be a single keychain operation, so
    /// the age check is what makes the pair safe rather than merely narrow:
    /// inside `releaseBefore` no other process was entitled to break this lock,
    /// so nothing can have claimed it between the two calls. Once past that,
    /// the lease is left to expire on its own rather than risk deleting the
    /// lock of whoever took over.
    static func release(_ lease: Lease) {
        guard lease.age < releaseBefore, current()?.owner == lease.owner else { return }

        keychain.delete(account: account)
    }

    /// Clears a lease already judged abandoned, and only if it's still the one
    /// we judged.
    ///
    /// This check-then-delete isn't atomic either, but the interleaving that
    /// would matter needs a *third* party to claim the lock in between, and only
    /// two processes ever share this grant: the app and the share extension.
    /// Whichever of them is recovering here is the live one, and the lease it's
    /// clearing belongs to the other — which is dead, by definition of
    /// `isAbandoned`.
    private static func breakLease(_ lease: Lease) {
        guard current()?.owner == lease.owner else { return }

        keychain.delete(account: account)
    }

    /// A lease is written off once it has had far longer than a refresh needs,
    /// or once its timestamp is in the future — which means the clock moved
    /// backwards under it, and waiting on `staleAfter` would never elapse.
    private static func isAbandoned(_ lease: Lease) -> Bool {
        lease.age > staleAfter || lease.age < 0
    }

    private static func current() -> Lease? {
        guard let data = keychain.read(account: account) else { return nil }

        return Lease(data)
    }
}
