//
//  SearchView.swift
//  iOS (App)
//
//  Full-text search over bookmarks (`GET /api/search?q=…`).
//

import Combine
import SwiftUI

@MainActor
final class SearchModel: ObservableObject {
    @Published var query = ""
    @Published var results: [Bookmark] = []
    @Published var totalCount = 0
    @Published var isSearching = false
    @Published var isLoadingMore = false
    @Published var searchError: String?
    /// Surfaced as an alert when an edit or trash action fails.
    @Published var actionError: String?
    /// `true` once a query has actually run, so the idle prompt can step aside.
    @Published var hasSearched = false

    private let pageSize = 25
    private var searchTask: Task<Void, Never>?
    /// The term the current results belong to — paging must not mix terms.
    private var activeTerm = ""

    var canLoadMore: Bool {
        !results.isEmpty && results.count < totalCount
    }

    /// Debounced so typing doesn't fire a request per keystroke.
    func queryChanged() {
        searchTask?.cancel()

        let term = query.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !term.isEmpty else {
            results = []
            totalCount = 0
            searchError = nil
            hasSearched = false
            activeTerm = ""
            return
        }

        searchTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 350_000_000)

            guard !Task.isCancelled else { return }

            await self?.search(term)
        }
    }

    /// Runs immediately, e.g. when the keyboard's Search key is tapped.
    func submit() {
        searchTask?.cancel()

        let term = query.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !term.isEmpty else { return }

        searchTask = Task { [weak self] in
            await self?.search(term)
        }
    }

    private func search(_ term: String) async {
        isSearching = true
        searchError = nil

        do {
            let page = try await OtterClient.shared.bookmarks(
                source: .search(term),
                limit: pageSize,
                offset: 0
            )

            guard !Task.isCancelled else { return }

            activeTerm = term
            results = page.data
            totalCount = page.count
            hasSearched = true
        } catch {
            searchError = error.localizedDescription
            hasSearched = true
        }

        isSearching = false
    }

    func replace(_ bookmark: Bookmark) {
        guard let index = results.firstIndex(where: { $0.id == bookmark.id }) else { return }

        if bookmark.status == "inactive" {
            results.remove(at: index)
            totalCount = max(0, totalCount - 1)
        } else {
            results[index] = bookmark
        }
    }

    /// Flips the star, showing the change straight away and rolling it back if
    /// the request fails. Search has no filters, so the row always stays put.
    func toggleStar(_ bookmark: Bookmark) async {
        var updated = bookmark
        updated.star.toggle()

        await applyFlag(updated, revertingTo: bookmark) {
            try await OtterClient.shared.setStar(id: bookmark.id, star: updated.star)
        }
    }

    func togglePublic(_ bookmark: Bookmark) async {
        var updated = bookmark
        updated.isPublic.toggle()

        await applyFlag(updated, revertingTo: bookmark) {
            try await OtterClient.shared.setPublic(id: bookmark.id, isPublic: updated.isPublic)
        }
    }

    private func applyFlag(
        _ optimistic: Bookmark,
        revertingTo original: Bookmark,
        request: () async throws -> Bookmark
    ) async {
        guard let index = results.firstIndex(where: { $0.id == original.id }) else { return }

        results[index] = optimistic

        do {
            replace(try await request())
        } catch {
            // Re-find rather than reuse `index`: the list may have moved while
            // the request was in flight.
            if let current = results.firstIndex(where: { $0.id == original.id }) {
                results[current] = original
            }

            actionError = error.localizedDescription
        }
    }

    func trash(_ bookmark: Bookmark) async {
        guard let index = results.firstIndex(where: { $0.id == bookmark.id }) else { return }

        results.remove(at: index)
        totalCount = max(0, totalCount - 1)

        do {
            try await OtterClient.shared.trashBookmark(id: bookmark.id)
        } catch {
            results.insert(bookmark, at: min(index, results.count))
            totalCount += 1
            actionError = error.localizedDescription
        }
    }

    func loadMore() async {
        guard canLoadMore, !isLoadingMore, !isSearching, !activeTerm.isEmpty else { return }

        let term = activeTerm
        isLoadingMore = true

        do {
            let page = try await OtterClient.shared.bookmarks(
                source: .search(term),
                limit: pageSize,
                offset: results.count
            )

            // Discard the page if the term moved on while it was in flight.
            if term == activeTerm {
                let countBefore = results.count
                let known = Set(results.map(\.id))
                results.append(contentsOf: page.data.filter { !known.contains($0.id) })

                // Nothing new means the server has no more to give; pin the total
                // so `canLoadMore` goes false rather than refetching forever.
                if results.count == countBefore {
                    totalCount = results.count
                } else {
                    totalCount = max(page.count, results.count)
                }
            }
        } catch {
            searchError = error.localizedDescription
        }

        isLoadingMore = false
    }
}

struct SearchView: View {
    @StateObject private var model = SearchModel()
    @State private var editing: Bookmark?
    @State private var detail: Bookmark?
    @State private var reader: ArticleReaderRequest?

    var body: some View {
        themedBody.otterTheme()
    }

    private var themedBody: some View {
        NavigationStack {
            List {
                ForEach(model.results) { bookmark in
                    BookmarkListRow(
                        bookmark: bookmark,
                        onEdit: { editing = bookmark },
                        onShowDetail: { detail = bookmark },
                        onOpenReader: { mode in
                            reader = ArticleReaderRequest(bookmark: bookmark, mode: mode)
                        },
                        onToggleStar: { Task { await model.toggleStar(bookmark) } },
                        onTogglePublic: { Task { await model.togglePublic(bookmark) } },
                        onTrash: { Task { await model.trash(bookmark) } }
                    )
                    .listRowBackground(Color.clear)
                }

                if model.canLoadMore {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .task { await model.loadMore() }
                    .listRowBackground(Color.clear)
                }
            }
            .listStyle(.plain)
            .otterTheme()
            .overlay { status }
            .navigationTitle("Search")
            .toolbar { OtterToolbarItems() }
            .searchable(
                text: $model.query,
                placement: .navigationBarDrawer(displayMode: .always),
                prompt: "Search bookmarks"
            )
            .onChange(of: model.query) { _, _ in
                model.queryChanged()
            }
            .onSubmit(of: .search) {
                model.submit()
            }
            .sheet(item: $editing) { bookmark in
                BookmarkFormView(bookmark: bookmark) { saved in
                    editing = nil

                    if let saved {
                        model.replace(saved)
                    }
                }
            }
            .sheet(item: $reader) { request in
                ArticleReaderView(bookmark: request.bookmark, mode: request.mode)
            }
            .sheet(item: $detail) { bookmark in
                NavigationStack {
                    BookmarkDetailView(bookmark: bookmark) {
                        detail = nil
                        // Let the detail sheet finish dismissing before the
                        // editor takes its place, or the second never appears.
                        Task {
                            try? await Task.sleep(nanoseconds: 350_000_000)
                            editing = bookmark
                        }
                    }
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") { detail = nil }
                        }
                    }
                }
            }
            .alert(
                "Couldn't update bookmark",
                isPresented: Binding(
                    get: { model.actionError != nil },
                    set: { if !$0 { model.actionError = nil } }
                )
            ) {
                Button("OK") { model.actionError = nil }
            } message: {
                Text(model.actionError ?? "")
            }
        }
    }

    @ViewBuilder
    private var status: some View {
        if model.isSearching, model.results.isEmpty {
            ProgressView()
        } else if let error = model.searchError, model.results.isEmpty {
            ContentUnavailableView(
                "Search failed",
                systemImage: "exclamationmark.triangle",
                description: Text(error)
            )
        } else if model.results.isEmpty, model.hasSearched {
            ContentUnavailableView.search(text: model.query)
        } else if model.results.isEmpty {
            ContentUnavailableView(
                "Search your bookmarks",
                systemImage: "magnifyingglass",
                description: Text("Matches titles, descriptions and notes.")
            )
        }
    }
}
