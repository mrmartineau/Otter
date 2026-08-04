//
//  BookmarkFormModel.swift
//  Shared (Core)
//
//  Drives the new-bookmark form: scraping, AI rewrites, AI classification,
//  duplicate detection and the save itself. Mirrors the behaviour of
//  `packages/web/src/components/BookmarkForm.tsx`.
//

import Combine
import Foundation

@MainActor
final class BookmarkFormModel: ObservableObject {
    // Fields
    @Published var url: String
    @Published var title = ""
    @Published var descriptionText = ""
    @Published var note = ""
    @Published var image = ""
    @Published var type = "link"
    @Published var tags: [String] = []
    @Published var tagQuery = ""
    private var feed: String?

    // Supporting state
    @Published var isSignedIn = true
    @Published var availableTags: [String] = []
    @Published var newTagNames: Set<String> = []
    @Published var matchingBookmarks: [Bookmark] = []
    @Published var scrapedTitle: String?
    @Published var scrapedDescription: String?
    @Published var showNote = false

    // Progress
    @Published var isScraping = false
    @Published var isLoadingTags = false
    @Published var isClassifying = false
    @Published var isRewritingTitle = false
    @Published var isRewritingDescription = false
    @Published var isSaving = false
    @Published var isSaved = false

    // Errors are kept apart so one failing request can't wipe another's message,
    // and so each can be retried from the section it belongs to.
    /// Fetching metadata for the URL.
    @Published var scrapeError: String?
    /// Fetching the tag list that backs the suggestions.
    @Published var tagsError: String?
    /// Saving, and the AI actions.
    @Published var errorMessage: String?

    /// New bookmark, or an edit of an existing one.
    enum Mode: Equatable {
        case create
        case edit(id: String)

        var isEdit: Bool {
            self != .create
        }
    }

    let mode: Mode

    private let initialURL: String
    private let existing: Bookmark?
    private var hasAutoClassified = false
    private var lastScrapedURL: String?
    private var duplicateCheckTask: Task<Void, Never>?

    init(url: String) {
        mode = .create
        existing = nil
        initialURL = url
        self.url = url
    }

    init(bookmark: Bookmark) {
        mode = .edit(id: bookmark.id)
        existing = bookmark
        initialURL = bookmark.url ?? ""
        url = bookmark.url ?? ""
        apply(bookmark)
    }

    private func apply(_ bookmark: Bookmark) {
        title = bookmark.title ?? ""
        descriptionText = bookmark.description ?? ""
        note = bookmark.note ?? ""
        image = bookmark.image ?? ""
        type = bookmark.type ?? "link"
        tags = bookmark.tags ?? []
        showNote = !(bookmark.note ?? "").isEmpty
    }

    // MARK: - Derived state

    /// Adds a scheme if the user typed a bare host; otherwise leaves the link alone.
    var normalizedURL: URL? {
        var text = url.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !text.isEmpty else { return nil }

        if !text.contains("://") {
            text = "https://" + text
        }

        guard let parsed = URL(string: text), parsed.scheme != nil, parsed.host != nil else {
            return nil
        }

        return parsed
    }

    /// Saving deliberately doesn't depend on the scrape succeeding. A link that
    /// 404s, sits behind a login, or doesn't exist yet is still worth keeping —
    /// only an unparseable address stops us.
    var canSave: Bool {
        isSignedIn && !isSaved && !isSaving && normalizedURL != nil
    }

    /// Something was typed, but it can't be read as a web address — the one case
    /// where Save stays disabled, so the form owes the user an explanation.
    var hasUnusableURL: Bool {
        !url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && normalizedURL == nil
    }

    var titleSuggestion: String? {
        guard let scrapedTitle, !scrapedTitle.isEmpty, scrapedTitle != title else { return nil }
        return scrapedTitle
    }

    var descriptionSuggestion: String? {
        guard let scrapedDescription,
              !scrapedDescription.isEmpty,
              scrapedDescription != descriptionText
        else {
            return nil
        }
        return scrapedDescription
    }

    /// Image paths may be root-relative, so resolve them against the page origin
    /// (the web form's `fullPath`).
    var imagePreviewURL: URL? {
        guard !image.isEmpty else { return nil }

        if image.hasPrefix("/"),
           let page = normalizedURL,
           var components = URLComponents(url: page, resolvingAgainstBaseURL: false) {
            components.path = image
            components.query = nil
            components.fragment = nil
            return components.url
        }

        return URL(string: image)
    }

    /// Existing tags matching what's being typed, minus the ones already added.
    var tagSuggestions: [String] {
        let query = tagQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let pool = availableTags.filter { !tags.contains($0) }

        guard !query.isEmpty else { return Array(pool.prefix(8)) }

        return Array(pool.filter { $0.lowercased().contains(query) }.prefix(8))
    }

    // MARK: - Lifecycle

    func start() async {
        isSignedIn = await OtterClient.shared.isSignedIn()

        guard isSignedIn else { return }

        async let tagLoad: Void = loadTags()

        // A URL handed to us (share sheet, otter://save) gets scraped straight away,
        // exactly like the web form does with `?url=`. Editing never re-scrapes on
        // its own — that would overwrite what's already saved.
        if !initialURL.isEmpty, !mode.isEdit {
            await scrape()
        }

        await tagLoad
    }

    /// The tag list behind the suggestions. This used to swallow its error, which
    /// left the field looking as though the account simply had no tags.
    func loadTags() async {
        isLoadingTags = true
        tagsError = nil

        do {
            let loaded = try await retrying { try await OtterClient.shared.tags() }

            availableTags = loaded
                .compactMap { entry -> (tag: String, count: Int)? in
                    guard let tag = entry.tag,
                          tag != "Untagged",
                          !tag.hasPrefix("like:")
                    else {
                        return nil
                    }

                    return (tag, entry.count ?? 0)
                }
                // Most-used first, so the eight suggestions offered before you
                // type anything are the tags you actually reach for. Matches the
                // API's own `ORDER BY count DESC, tag ASC`; sorted here rather
                // than trusting that ordering to survive silently.
                .sorted {
                    $0.count == $1.count
                        ? $0.tag.lowercased() < $1.tag.lowercased()
                        : $0.count > $1.count
                }
                .map(\.tag)
        } catch {
            tagsError = message(for: error)
        }

        isLoadingTags = false
    }

    // MARK: - Scraping

    func scrape() async {
        guard let target = normalizedURL, !isScraping else { return }

        isScraping = true
        scrapeError = nil

        do {
            let metadata = try await retrying {
                try await OtterClient.shared.scrape(url: target.absoluteString)
            }
            lastScrapedURL = target.absoluteString
            scrapedTitle = metadata.title
            scrapedDescription = metadata.description
            title = metadata.title ?? title
            descriptionText = metadata.description ?? descriptionText

            // The scraper sometimes echoes the page URL as the image; ignore that.
            if let scrapedImage = metadata.image, scrapedImage != metadata.url {
                image = scrapedImage
            }

            if let resolved = metadata.resolvedURL, resolved != target.absoluteString {
                url = resolved
                lastScrapedURL = resolved
            }

            feed = metadata.feeds.first
            type = metadata.urlType ?? type
            isScraping = false

            if !hasAutoClassified {
                hasAutoClassified = true
                await classify()
            }
        } catch {
            isScraping = false
            scrapeError = message(for: error)
        }
    }

    /// Called when the URL field is committed — re-scrapes only if the URL changed.
    func scrapeIfURLChanged() async {
        guard let target = normalizedURL, target.absoluteString != lastScrapedURL else { return }
        await scrape()
    }

    // MARK: - AI

    func classify() async {
        guard !isClassifying, normalizedURL != nil || !title.isEmpty else { return }

        isClassifying = true
        errorMessage = nil

        do {
            let result = try await OtterClient.shared.classify(
                url: normalizedURL?.absoluteString ?? url,
                title: title,
                description: descriptionText,
                currentType: type,
                existingTags: availableTags
            )
            newTagNames = Set(result.tags.filter(\.isNew).map(\.name))
            tags += result.tags.map(\.name).filter { !tags.contains($0) }

            if let suggestedType = result.type, !suggestedType.isEmpty {
                type = suggestedType
            }
        } catch {
            errorMessage = message(for: error)
        }

        isClassifying = false
    }

    func rewriteTitle() async {
        guard !title.isEmpty, !isRewritingTitle else { return }

        isRewritingTitle = true

        do {
            title = try await OtterClient.shared.rewriteTitle(title)
        } catch {
            errorMessage = message(for: error)
        }

        isRewritingTitle = false
    }

    func rewriteDescription() async {
        guard !descriptionText.isEmpty, !isRewritingDescription else { return }

        isRewritingDescription = true

        do {
            descriptionText = try await OtterClient.shared.rewriteDescription(
                descriptionText,
                title: title
            )
        } catch {
            errorMessage = message(for: error)
        }

        isRewritingDescription = false
    }

    // MARK: - Duplicates

    /// Debounced lookup of bookmarks that already point at this host.
    func checkForDuplicates() {
        duplicateCheckTask?.cancel()

        guard let host = normalizedURL?.host else {
            matchingBookmarks = []
            return
        }

        duplicateCheckTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 400_000_000)

            guard !Task.isCancelled else { return }

            let found = try? await OtterClient.shared.matchingBookmarks(query: host)

            guard !Task.isCancelled else { return }

            self?.matchingBookmarks = found ?? []
        }
    }

    // MARK: - Tags

    func addTag(_ tag: String) {
        let trimmed = tag.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmed.isEmpty, !tags.contains(trimmed) else {
            tagQuery = ""
            return
        }

        tags.append(trimmed)
        tagQuery = ""
    }

    func removeTag(_ tag: String) {
        tags.removeAll { $0 == tag }
        newTagNames.remove(tag)
    }

    func commitTagQuery() {
        // Accept comma-separated entry in one go.
        let parts = tagQuery.split(separator: ",").map(String.init)

        guard parts.count > 1 else {
            addTag(tagQuery)
            return
        }

        for part in parts {
            addTag(part)
        }

        tagQuery = ""
    }

    // MARK: - Save & reset

    /// Returns the saved bookmark so a list can update the row in place.
    func save() async -> Bookmark? {
        guard let target = normalizedURL else { return nil }

        isSaving = true
        errorMessage = nil

        let draft = BookmarkDraft(
            url: target.absoluteString,
            title: fieldValue(title),
            description: fieldValue(descriptionText),
            image: fieldValue(image),
            note: fieldValue(note),
            tags: mode.isEdit ? tags : (tags.isEmpty ? nil : tags),
            type: fieldValue(type),
            feed: feed
        )

        do {
            let saved: Bookmark

            switch mode {
            case .create:
                saved = try await OtterClient.shared.createBookmark(draft)
            case let .edit(id):
                saved = try await OtterClient.shared.updateBookmark(id: id, draft: draft)
            }

            isSaving = false
            isSaved = true
            return saved
        } catch {
            isSaving = false
            errorMessage = message(for: error)
            return nil
        }
    }

    func reset() {
        url = initialURL
        tagQuery = ""
        feed = nil
        newTagNames = []
        matchingBookmarks = []
        scrapedTitle = nil
        scrapedDescription = nil
        errorMessage = nil
        scrapeError = nil
        tagsError = nil
        hasAutoClassified = false
        lastScrapedURL = nil

        if let existing {
            // Editing resets back to what's stored, not to blank.
            apply(existing)
            return
        }

        title = ""
        descriptionText = ""
        note = ""
        image = ""
        type = "link"
        tags = []
        showNote = false
    }

    /// Omits empty fields when creating, but sends them as empty strings when
    /// editing — a PATCH ignores absent keys, so that's the only way to clear one.
    private func fieldValue(_ value: String) -> String? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)

        if !trimmed.isEmpty {
            return trimmed
        }

        return mode.isEdit ? "" : nil
    }

    /// The message to show for a failure, or `nil` when the sign-in went away —
    /// the form swaps to its signed-out state instead of reporting an error.
    private func message(for error: Error) -> String? {
        if error is CancellationError {
            return nil
        }

        switch error {
        case OtterError.notSignedIn, OtterError.invalidGrant:
            isSignedIn = false
            return nil
        default:
            return error.localizedDescription
        }
    }

    /// Retries a request through transient failures. The form fetches once when
    /// it opens, so without this a single blip leaves it permanently missing its
    /// metadata or its tag list with no way back.
    private func retrying<T>(
        attempts: Int = 3,
        _ operation: () async throws -> T
    ) async throws -> T {
        var lastError: Error = OtterError.invalidResponse

        for attempt in 0 ..< attempts {
            try Task.checkCancellation()

            do {
                return try await operation()
            } catch {
                guard Self.isTransient(error) else { throw error }
                lastError = error
            }

            // 400ms, then 800ms.
            if attempt < attempts - 1 {
                try await Task.sleep(nanoseconds: UInt64(400_000_000) << UInt64(attempt))
            }
        }

        throw lastError
    }

    /// Whether trying the same request again could plausibly work. A 4xx, a bad
    /// address or a dead grant are all settled answers — retrying just stalls.
    private static func isTransient(_ error: Error) -> Bool {
        if error is URLError { return true }

        switch error {
        case OtterError.serverUnavailable, OtterError.invalidResponse:
            return true
        default:
            return false
        }
    }
}
