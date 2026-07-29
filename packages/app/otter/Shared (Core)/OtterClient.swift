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
    private var didLoad = false
    private var refreshTask: Task<OtterCredentials, Error>?

    // MARK: - Credentials

    func credentials() -> OtterCredentials? {
        if !didLoad {
            cached = OtterCredentialStore.load()
            didLoad = true
        }

        return cached
    }

    func isSignedIn() -> Bool {
        credentials() != nil
    }

    func store(_ credentials: OtterCredentials) {
        // A different instance means the cached page belongs to someone else.
        if cached?.instanceURL != credentials.instanceURL {
            BookmarkCache.clear()
        }

        cached = credentials
        didLoad = true
        OtterCredentialStore.save(credentials)
    }

    func signOut() {
        cached = nil
        didLoad = true
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

    private func perform(
        path: String,
        method: String = "GET",
        query: [URLQueryItem] = [],
        body: Data? = nil
    ) async throws -> Data {
        guard var current = credentials() else { throw OtterError.notSignedIn }

        if current.isExpired {
            current = try await refreshed(current)
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
            current = try await refreshed(current)
            result = try await send(
                credentials: current,
                path: path,
                method: method,
                query: query,
                body: body
            )
        }

        guard (200 ..< 300).contains(result.status) else {
            throw OtterError.server(
                OtterOAuth.errorMessage(from: result.data) ?? "Otter returned \(result.status)."
            )
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

    /// Coalesces concurrent refreshes so a rotated refresh token isn't spent twice.
    private func refreshed(_ credentials: OtterCredentials) async throws -> OtterCredentials {
        if let refreshTask {
            return try await refreshTask.value
        }

        let task = Task { try await self.performRefresh(credentials) }
        refreshTask = task

        defer { refreshTask = nil }

        return try await task.value
    }

    private func performRefresh(_ credentials: OtterCredentials) async throws -> OtterCredentials {
        guard let refreshToken = credentials.refreshToken else {
            signOut()
            throw OtterError.notSignedIn
        }

        do {
            let token = try await OtterOAuth.refresh(
                refreshToken,
                clientID: credentials.clientID,
                instanceURL: credentials.instanceURL
            )
            var updated = credentials
            updated.accessToken = token.accessToken
            updated.refreshToken = token.refreshToken ?? credentials.refreshToken
            updated.expiresAt = token.expiresAt
            store(updated)

            return updated
        } catch {
            // The grant is gone (revoked, expired or rotated away) — drop it so
            // the UI falls back to the sign-in screen.
            signOut()
            throw OtterError.notSignedIn
        }
    }
}
