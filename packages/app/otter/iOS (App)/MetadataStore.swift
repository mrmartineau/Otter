//
//  MetadataStore.swift
//  iOS (App)
//
//  Tags, types and collections, shared by their three tabs. One `/api/meta`
//  request feeds all of them, seeded from disk so the tabs open populated.
//

import Combine
import Foundation

@MainActor
final class MetadataStore: ObservableObject {
    static let shared = MetadataStore()

    @Published private(set) var tags: [TagCount] = []
    @Published private(set) var types: [TypeCount] = []
    @Published private(set) var collections: [OtterCollection] = []
    @Published private(set) var isLoading = false
    @Published private(set) var loadError: String?

    /// Anything older than this is refetched when a tab appears or the app
    /// returns to the foreground.
    private let staleAfter: TimeInterval = 60
    private var lastLoaded: Date?
    private var inFlight: Task<Void, Never>?

    private init() {
        NotificationCenter.default.addObserver(
            forName: .otterSignedOut,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.reset()
            }
        }
    }

    var isEmpty: Bool {
        tags.isEmpty && types.isEmpty && collections.isEmpty
    }

    /// Seeds from the cache once, then refreshes if what we have has aged out.
    func start() async {
        if isEmpty, let cached = await OtterClient.shared.cachedMeta() {
            apply(cached)
            lastLoaded = await OtterClient.shared.cacheTimestamps().meta
        }

        await refreshIfStale()
    }

    func refreshIfStale() async {
        guard let lastLoaded else {
            await refresh()
            return
        }

        guard Date().timeIntervalSince(lastLoaded) > staleAfter else { return }

        await refresh()
    }

    /// Coalesced so three tabs appearing at once don't each fire a request.
    func refresh() async {
        if let inFlight {
            await inFlight.value
            return
        }

        let task = Task { [weak self] in
            guard let self else { return }
            await self.load()
        }
        inFlight = task
        await task.value
        inFlight = nil
    }

    private func load() async {
        // Keep whatever is on screen; only show a spinner on a cold start.
        isLoading = isEmpty
        loadError = nil

        do {
            apply(try await OtterClient.shared.meta())
            lastLoaded = Date()
        } catch {
            loadError = error.localizedDescription
        }

        isLoading = false
    }

    private func apply(_ meta: OtterMeta) {
        tags = meta.tags.filter { $0.tag?.isEmpty == false }
        types = meta.types
            .filter { $0.type?.isEmpty == false }
            .sorted { ($0.count ?? 0) > ($1.count ?? 0) }
        collections = meta.collections.filter { !$0.collection.isEmpty }
    }

    private func reset() {
        tags = []
        types = []
        collections = []
        loadError = nil
        lastLoaded = nil
    }
}
