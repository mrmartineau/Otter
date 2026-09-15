//
//  OtterClient.swift
//  Shared (Core)
//
//  Thin client over Otter's REST API. Owns the stored credentials, refreshes
//  the access token when it expires, and is shared by the app and the share
//  extension (each process gets its own instance, backed by the same keychain
//  item).
//

import Foundation

actor OtterClient {
    static let shared = OtterClient()

    private var cached: OtterCredentials?
    private var refreshTask: Task<OtterCredentials, Error>?

    // MARK: - Credentials

    func credentials() -> OtterCredentials? {
        if let cached {
            return cached
        }

        // Never latch a miss. iOS reuses share-extension processes, so one that
        // started before sign-in would otherwise claim "not signed in" forever.
        cached = OtterCredentialStore.load()

        return cached
    }

    func isSignedIn() -> Bool {
        credentials() != nil
    }

    /// Picks up whatever is in the shared keychain now. The share extension
    /// rotates the same grant from its own process, so this process's copy can
    /// be a rotation behind by the time the app comes back to the foreground —
    /// and using a rotated-away refresh token costs the whole grant.
    func reloadCredentials() {
        // A read that comes back empty is far more likely to be a locked
        // keychain than a sign-out, so it never clears what we already have.
        guard let stored = OtterCredentialStore.load() else { return }

        // Only ever move forward. If the write after our last rotation failed —
        // the case `store(_:)` reports — memory holds the only live token and
        // the stored one is already retired, so reading it back would hand the
        // instance a token it has revoked.
        if let cached, !Self.isNewer(stored, than: cached) { return }

        cached = stored
    }

    func store(_ credentials: OtterCredentials) {
        // A different instance means the cached page belongs to someone else.
        if cached?.instanceURL != credentials.instanceURL {
            BookmarkCache.clear()
        }

        cached = credentials

        if !OtterCredentialStore.save(credentials) {
            // The rotated token now exists only in this process. Nothing can be
            // done about it here, but it explains the sign-out that follows.
            print("Otter: failed to persist credentials to the keychain.")
        }
    }

    func signOut() {
        cached = nil
        OtterCredentialStore.clear()
        BookmarkCache.clear()
        MetadataCache.clear()
        // Screens that hit a dead grant mid-request need to fall back to sign-in.
        NotificationCenter.default.post(name: .otterSignedOut, object: nil)
    }

    /// The last first page we saw, available before any request is made.
    func cachedBookmarks() -> BookmarkPage? {
        BookmarkCache.load()
    }

    // MARK: - Bookmarks

    func bookmarks(
        source: BookmarkFeedSource = .all,
        filter: BookmarkFilter = .none,
        limit: Int,
        offset: Int
    ) async throws -> BookmarkPage {
        var path = "api/bookmarks"
        var query = [
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "offset", value: String(offset)),
        ]

        switch source {
        case .all:
            break
        case let .tag(tag):
            query.append(URLQueryItem(name: "tag", value: tag))
        case let .collection(name):
            // Collections span every `name:*` tag, so they have their own route.
            path = "api/collections/\(name.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? name)"
        case let .search(term):
            path = "api/search"
            query.append(URLQueryItem(name: "q", value: term))
        case let .type(type):
            query.append(URLQueryItem(name: "type", value: type))
        case .top:
            query.append(URLQueryItem(name: "top", value: "true"))
        }

        query.append(contentsOf: filter.queryItems)

        let data = try await perform(path: path, query: query)

        guard let page = try? JSONDecoder().decode(BookmarkPage.self, from: data) else {
            throw OtterError.invalidResponse
        }

        // Only the plain, unfiltered feed may seed the launch cache.
        if offset == 0, source.isCacheable, !filter.isActive {
            BookmarkCache.store(data)
        }

        return page
    }

    /// Tags, types and collections in one request — and cached to disk, so the
    /// Tags/Types/Collections tabs open populated.
    func meta() async throws -> OtterMeta {
        let data = try await perform(path: "api/meta")

        guard let meta = try? JSONDecoder().decode(OtterMeta.self, from: data) else {
            throw OtterError.invalidResponse
        }

        MetadataCache.store(data)

        return meta
    }

    func cachedMeta() -> OtterMeta? {
        MetadataCache.load()
    }

    /// When each cache was last written, for staleness checks.
    func cacheTimestamps() -> (bookmarks: Date?, meta: Date?) {
        (BookmarkCache.updatedAt, MetadataCache.updatedAt)
    }

    /// `POST /api/bookmarks` — the same endpoint the web form posts to, so every
    /// field the form edits is stored exactly as entered.
    func createBookmark(_ draft: BookmarkDraft) async throws -> Bookmark {
        struct Wrapper: Decodable {
            let data: Bookmark
        }

        let data = try await perform(
            path: "api/bookmarks",
            method: "POST",
            body: try JSONEncoder().encode(draft)
        )

        guard let wrapper = try? JSONDecoder().decode(Wrapper.self, from: data) else {
            throw OtterError.invalidResponse
        }

        // The new bookmark belongs at the top of the cached page.
        BookmarkCache.clear()

        return wrapper.data
    }

    /// `PATCH /api/bookmarks/:id` — only the keys present in the body are written.
    func updateBookmark(id: String, draft: BookmarkDraft) async throws -> Bookmark {
        struct Wrapper: Decodable {
            let data: Bookmark
        }

        let data = try await perform(
            path: "api/bookmarks/\(id)",
            method: "PATCH",
            body: try JSONEncoder().encode(draft)
        )

        guard let wrapper = try? JSONDecoder().decode(Wrapper.self, from: data) else {
            throw OtterError.invalidResponse
        }

        BookmarkCache.clear()

        return wrapper.data
    }

    func setStar(id: String, star: Bool) async throws -> Bookmark {
        try await patchFlag(id: id, body: ["star": star])
    }

    func setPublic(id: String, isPublic: Bool) async throws -> Bookmark {
        try await patchFlag(id: id, body: ["public": isPublic])
    }

    /// A `PATCH` carrying one key. The API writes only the keys it receives, so a
    /// toggle from a list row can't overwrite fields the edit form owns.
    private func patchFlag(id: String, body: [String: Bool]) async throws -> Bookmark {
        struct Wrapper: Decodable {
            let data: Bookmark
        }

        let data = try await perform(
            path: "api/bookmarks/\(id)",
            method: "PATCH",
            body: try JSONEncoder().encode(body)
        )

        guard let wrapper = try? JSONDecoder().decode(Wrapper.self, from: data) else {
            throw OtterError.invalidResponse
        }

        BookmarkCache.clear()

        return wrapper.data
    }

    /// Moves a bookmark to the trash by flipping its status to `inactive`.
    /// Deliberately omits `?permanent=true`, so nothing is destroyed.
    func trashBookmark(id: String) async throws {
        _ = try await perform(path: "api/bookmarks/\(id)", method: "DELETE")
        BookmarkCache.clear()
    }

    /// Bookmarks whose URL contains `query` — used to warn about duplicates.
    func matchingBookmarks(query: String) async throws -> [Bookmark] {
        struct Wrapper: Decodable {
            let data: [Bookmark]
        }

        let data = try await perform(
            path: "api/check-url",
            query: [URLQueryItem(name: "url_input", value: query)]
        )

        guard let wrapper = try? JSONDecoder().decode(Wrapper.self, from: data) else {
            throw OtterError.invalidResponse
        }

        return wrapper.data
    }

    // MARK: - Tags

    func tags() async throws -> [TagCount] {
        let data = try await perform(path: "api/tags")

        guard let tags = try? JSONDecoder().decode([TagCount].self, from: data) else {
            throw OtterError.invalidResponse
        }

        return tags
    }

    // MARK: - Scraping & AI

    func scrape(url: String) async throws -> ScrapeMetadata {
        let data = try await perform(
            path: "api/scrape",
            query: [URLQueryItem(name: "url", value: url)]
        )

        guard let metadata = try? JSONDecoder().decode(ScrapeMetadata.self, from: data) else {
            throw OtterError.invalidResponse
        }

        return metadata
    }

    /// The readable article behind a bookmark, for the in-app reader. Same
    /// endpoint the web app's `/bookmark/:id/read` route uses.
    func articleContent(url: String) async throws -> ArticleContent {
        let data = try await perform(
            path: "api/scrape-content",
            query: [URLQueryItem(name: "url", value: url)]
        )

        // Checked before decoding the article: an error payload would otherwise
        // decode cleanly into an empty ArticleContent.
        if let failure = try? JSONDecoder().decode(ScrapeFailure.self, from: data),
           let message = failure.error,
           !message.isEmpty {
            throw OtterError.server(message)
        }

        guard let article = try? JSONDecoder().decode(ArticleContent.self, from: data) else {
            throw OtterError.invalidResponse
        }

        return article
    }

    /// `POST /api/ai/summarise` — takes the extracted article body, not the URL.
    func summarise(_ content: String) async throws -> String {
        try await generate(path: "api/ai/summarise", body: ["prompt": content])
    }

    func rewriteTitle(_ title: String) async throws -> String {
        try await generate(path: "api/ai/title", body: ["prompt": title])
    }

    func rewriteDescription(_ description: String, title: String) async throws -> String {
        try await generate(
            path: "api/ai/description",
            body: ["prompt": description, "title": title]
        )
    }

    func classify(
        url: String,
        title: String,
        description: String,
        currentType: String,
        existingTags: [String]
    ) async throws -> ClassifyResult {
        struct Payload: Encodable {
            let url: String
            let title: String
            let description: String
            let currentType: String
            let tags: [String]
        }

        let data = try await perform(
            path: "api/ai/classify",
            method: "POST",
            body: try JSONEncoder().encode(
                Payload(
                    url: url,
                    title: title,
                    description: description,
                    currentType: currentType,
                    tags: existingTags
                )
            )
        )

        guard let result = try? JSONDecoder().decode(ClassifyResult.self, from: data) else {
            throw OtterError.invalidResponse
        }

        return result
    }

    private func generate(path: String, body: [String: String]) async throws -> String {
        struct Generated: Decodable {
            let response: String
        }

        let data = try await perform(
            path: path,
            method: "POST",
            body: try JSONEncoder().encode(body)
        )

        guard let generated = try? JSONDecoder().decode(Generated.self, from: data) else {
            throw OtterError.invalidResponse
        }

        return generated.response
    }

    // MARK: - Transport

    func perform(
        path: String,
        method: String = "GET",
        query: [URLQueryItem] = [],
        body: Data? = nil
    ) async throws -> Data {
        guard var current = credentials() else { throw OtterError.notSignedIn }

        if current.isExpired {
            current = try await refreshed(replacing: current)
        }

        var result = try await send(
            credentials: current,
            path: path,
            method: method,
            query: query,
            body: body
        )

        // An access token can be rejected before our own expiry check notices —
        // refresh once and retry before giving up.
        if result.status == 401 {
            current = try await refreshed(replacing: current)
            result = try await send(
                credentials: current,
                path: path,
                method: method,
                query: query,
                body: body
            )
        }

        guard (200 ..< 300).contains(result.status) else {
            let message = OtterOAuth.errorMessage(from: result.data)
                ?? "Otter returned \(result.status)."

            // 5xx is worth another go; a 4xx is a considered "no".
            throw result.status >= 500
                ? OtterError.serverUnavailable(message)
                : OtterError.server(message)
        }

        return result.data
    }

    private func send(
        credentials: OtterCredentials,
        path: String,
        method: String,
        query: [URLQueryItem],
        body: Data?
    ) async throws -> (data: Data, status: Int) {
        var components = URLComponents(
            url: credentials.instanceURL.appendingPathComponent(path),
            resolvingAgainstBaseURL: false
        )

        if !query.isEmpty {
            components?.queryItems = query
        }

        guard let url = components?.url else { throw OtterError.invalidInstanceURL }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(credentials.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        return (data, (response as? HTTPURLResponse)?.statusCode ?? 0)
    }

    /// Credentials that supersede `stale`, refreshing only when nothing newer
    /// exists yet.
    ///
    /// Refresh tokens are single-use: spending one retires it, and offering a
    /// retired one is treated as theft, so the instance revokes every token this
    /// client holds. Two requests racing the same 401 — which is exactly what
    /// the bookmark form does, loading tags and scraping at once — both arrive
    /// here holding the same credentials, and the second must adopt the first's
    /// result rather than spend the token again. The revocation is silent when
    /// it happens: the sign-out only surfaces at the next expiry, hours later.
    private func refreshed(replacing stale: OtterCredentials) async throws -> OtterCredentials {
        if let fresher = superseding(stale) {
            return fresher
        }

        if let refreshTask {
            return try await refreshTask.value
        }

        let task = Task { try await self.performRefresh(stale) }
        refreshTask = task

        defer { refreshTask = nil }

        return try await task.value
    }

    /// Usable credentials newer than `stale` — from this process, or written to
    /// the shared keychain by the other one.
    private func superseding(_ stale: OtterCredentials) -> OtterCredentials? {
        if let cached, cached.accessToken != stale.accessToken, !cached.isExpired {
            return cached
        }

        guard let stored = OtterCredentialStore.load(),
              stored.accessToken != stale.accessToken,
              !stored.isExpired
        else {
            return nil
        }

        // Never walk backwards onto a token this process rotated past but
        // failed to persist.
        if let cached, !Self.isNewer(stored, than: cached) { return nil }

        cached = stored

        return stored
    }

    /// Whether `candidate` should replace `known`.
    ///
    /// A different instance or client isn't a later rotation of the same grant
    /// at all — it's a different account, from a sign-in that happened
    /// elsewhere. The shared keychain is what decides who we're signed in as, so
    /// those always win outright and are never ranked by expiry.
    ///
    /// Same grant: the rotation counter orders them. Expiry is only the
    /// fallback for credentials written before the counter existed, and it's a
    /// fallback rather than the rule because it silently assumes the instance's
    /// access-token TTL never changes — lower `OAUTH_ACCESS_TOKEN_TTL` between
    /// two refreshes and the newer token carries the *earlier* expiry.
    private static func isNewer(
        _ candidate: OtterCredentials,
        than known: OtterCredentials
    ) -> Bool {
        guard candidate.instanceURL == known.instanceURL,
              candidate.clientID == known.clientID
        else {
            return true
        }

        if let candidateRotation = candidate.rotation, let knownRotation = known.rotation {
            return candidateRotation > knownRotation
        }

        guard let candidateExpiry = candidate.expiresAt else { return true }
        guard let knownExpiry = known.expiresAt else { return false }

        return candidateExpiry > knownExpiry
    }

    private func performRefresh(_ credentials: OtterCredentials) async throws -> OtterCredentials {
        guard credentials.refreshToken != nil else {
            signOut()
            throw OtterError.notSignedIn
        }

        // Whoever takes the lock rotates the grant; everyone else waits and
        // picks up the result. Without it the app and the share extension can
        // spend the same refresh token from their separate processes, and the
        // loser's request is what revokes the grant.
        let lease: OtterRefreshLock.Lease?

        switch await OtterRefreshLock.acquire() {
        case let .acquired(held):
            lease = held
        case .unavailable:
            // No lock to be had. Racing beats never refreshing at all.
            lease = nil
        case .busy:
            // Another process is still rotating. Its result will reach the
            // keychain shortly, so the caller retries — refreshing now would
            // spend a token that is about to be retired, and that is what costs
            // the whole grant.
            if let fresher = superseding(credentials) {
                return fresher
            }

            throw OtterError.serverUnavailable(
                "Otter is still refreshing this sign-in. Try again in a moment."
            )
        }

        defer {
            if let lease {
                OtterRefreshLock.release(lease)
            }
        }

        // Re-read now the lock is held: whoever held it before almost certainly
        // rotated, which leaves the token we were called with already retired.
        if let fresher = superseding(credentials) {
            return fresher
        }

        let current = OtterCredentialStore.load().map {
            Self.isNewer($0, than: credentials) ? $0 : credentials
        } ?? credentials

        guard let refreshToken = current.refreshToken else {
            signOut()
            throw OtterError.notSignedIn
        }

        do {
            let token = try await OtterOAuth.refresh(
                refreshToken,
                clientID: current.clientID,
                instanceURL: current.instanceURL
            )
            var updated = current
            updated.accessToken = token.accessToken
            updated.refreshToken = token.refreshToken ?? current.refreshToken
            updated.expiresAt = token.expiresAt
            // Bumped under the lock, so the count stays monotonic across both
            // processes and orders the copies without relying on the expiry.
            updated.rotation = (current.rotation ?? 0) + 1
            store(updated)

            return updated
        } catch OtterError.invalidGrant {
            // Last line of defence: another process may have rotated between the
            // re-read above and this request landing.
            if let stored = OtterCredentialStore.load(),
               stored.refreshToken != refreshToken {
                cached = stored
                return stored
            }

            // Genuinely revoked or expired — drop it so the UI asks for sign-in.
            signOut()
            throw OtterError.notSignedIn
        }

        // Any other failure (offline, 5xx, rate limited) is transient. Keep the
        // credentials and let the caller surface the error, otherwise a flaky
        // network would sign the user out of both the app and the extension.
    }
}
