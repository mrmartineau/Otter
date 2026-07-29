//
//  BookmarkFeedModel.swift
//  iOS (App)
//
//  One paginated list of bookmarks — all of them, a tag, or a collection.
//

import Combine
import Foundation

@MainActor
final class BookmarkFeedModel: ObservableObject {
    let source: BookmarkFeedSource
    /// Star / public / date-window toggles layered on top of the source.
    @Published var filter: BookmarkFilter

    @Published var bookmarks: [Bookmark] = []
    @Published var totalCount = 0
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var loadError: String?
    /// Surfaced as an alert when an edit or trash action fails.
    @Published var actionError: String?

    private let pageSize = 25
    private var hasLoaded = false
    private var lastLoaded: Date?
    /// Anything older than this is refetched when the list reappears or the app
    /// returns to the foreground.
    private let staleAfter: TimeInterval = 60

    init(source: BookmarkFeedSource, filter: BookmarkFilter = .none) {
        self.source = source
        self.filter = filter
    }

    /// Re-runs the query from the top whenever a toggle changes.
    func applyFilter(_ newFilter: BookmarkFilter) async {
        guard newFilter != filter else { return }

        filter = newFilter
        bookmarks = []
        totalCount = 0
        hasLoaded = true
        await load()
    }

    var canLoadMore: Bool {
        !bookmarks.isEmpty && bookmarks.count < totalCount
    }

    /// Seeds from the on-disk cache where available, then hits the network once.
    func start() async {
        if !hasLoaded, source.isCacheable, !filter.isActive, bookmarks.isEmpty,
           let cached = await OtterClient.shared.cachedBookmarks() {
            bookmarks = cached.data
            totalCount = cached.count
            lastLoaded = await OtterClient.shared.cacheTimestamps().bookmarks
        }

        guard !hasLoaded else {
            await refreshIfStale()
            return
        }

        hasLoaded = true
        await load()
    }

    /// Silent catch-up: keeps the current rows on screen while it refetches.
    func refreshIfStale() async {
        guard hasLoaded || !bookmarks.isEmpty else { return }

        if let lastLoaded, Date().timeIntervalSince(lastLoaded) <= staleAfter {
            return
        }

        await load()
    }

    func load() async {
        isLoading = bookmarks.isEmpty
        loadError = nil

        do {
            let page = try await OtterClient.shared.bookmarks(
                source: source,
                filter: filter,
                limit: pageSize,
                offset: 0
            )
            bookmarks = page.data
            totalCount = page.count
            lastLoaded = Date()
        } catch {
            loadError = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Row actions

    /// Swaps in the edited bookmark, dropping it if it no longer belongs here.
    func replace(_ bookmark: Bookmark) {
        guard let index = bookmarks.firstIndex(where: { $0.id == bookmark.id }) else { return }

        if matches(bookmark) {
            bookmarks[index] = bookmark
        } else {
            bookmarks.remove(at: index)
            totalCount = max(0, totalCount - 1)
        }
    }

    /// Moves the bookmark to the trash, removing the row straight away and
    /// putting it back if the request fails.
    func trash(_ bookmark: Bookmark) async {
        guard let index = bookmarks.firstIndex(where: { $0.id == bookmark.id }) else { return }

        bookmarks.remove(at: index)
        totalCount = max(0, totalCount - 1)

        do {
            try await OtterClient.shared.trashBookmark(id: bookmark.id)
        } catch {
            bookmarks.insert(bookmark, at: min(index, bookmarks.count))
            totalCount += 1
            actionError = error.localizedDescription
        }
    }

    /// Whether an edited bookmark still belongs in this particular feed.
    private func matches(_ bookmark: Bookmark) -> Bool {
        guard bookmark.status != "inactive" else { return false }

        if filter.star, !bookmark.star { return false }

        switch source {
        case .all, .search, .top:
            return true
        case let .tag(tag):
            return bookmark.tags?.contains(tag) ?? false
        case let .collection(name):
            return bookmark.tags?.contains { $0 == name || $0.hasPrefix("\(name):") } ?? false
        case let .type(type):
            return bookmark.type == type
        }
    }

    func loadMore() async {
        guard canLoadMore, !isLoadingMore, !isLoading else { return }

        isLoadingMore = true

        do {
            let page = try await OtterClient.shared.bookmarks(
                source: source,
                filter: filter,
                limit: pageSize,
                offset: bookmarks.count
            )
            let known = Set(bookmarks.map(\.id))
            bookmarks.append(contentsOf: page.data.filter { !known.contains($0.id) })
            totalCount = page.count
        } catch {
            loadError = error.localizedDescription
        }

        isLoadingMore = false
    }
}
