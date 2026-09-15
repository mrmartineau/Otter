//
//  ReadingStore.swift
//  iOS (App)
//
//  The reading list: a disk-cached copy of `/api/reader/items`, synced with
//  `?since=`, plus a queue of local changes that drains when the network is
//  back. Every mutation is idempotent on the server, so replaying is safe.
//

import Combine
import Foundation

@MainActor
final class ReadingStore: ObservableObject {
    static let shared = ReadingStore()

    @Published private(set) var items: [ReadingItem] = []
    @Published private(set) var isSyncing = false
    @Published var lastError: String?

    /// A change made offline, replayed in order on the next sync.
    struct PendingMutation: Codable, Equatable {
        enum Kind: String, Codable { case progress, state, delete }
        let id: String
        let kind: Kind
        var state: String?
        var progress: Double?
    }

    private let cache = DiskCache(fileName: "reading-items.json")
    private let defaults = UserDefaults.standard
    private let sinceKey = "reading.since"
    private let pendingKey = "reading.pending"
    private var pending: [PendingMutation] {
        didSet {
            defaults.set(try? JSONEncoder().encode(pending), forKey: pendingKey)
        }
    }
    private var progressFlush: Task<Void, Never>?

    private init() {
        pending = defaults.data(forKey: pendingKey)
            .flatMap { try? JSONDecoder().decode([PendingMutation].self, from: $0) } ?? []
        items = cache.load([ReadingItem].self) ?? []

        NotificationCenter.default.addObserver(
            forName: .otterSignedOut,
            object: nil,
            queue: .main
        ) { _ in
            Task { @MainActor in ReadingStore.shared.reset() }
        }
    }

    /// Unread: newest bookmark first. Archive: most recently changed first,
    /// which is the item archived last.
    var unread: [ReadingItem] { items.filter { !$0.isArchived } }
    var archived: [ReadingItem] { items.filter(\.isArchived).sorted { $0.updatedAt > $1.updatedAt } }

    func item(id: String) -> ReadingItem? {
        items.first { $0.id == id }
    }

    // MARK: - Sync

    func start() async {
        guard await OtterClient.shared.isSignedIn() else { return }
        await sync()
    }

    /// Pushes queued changes, then pulls everything that changed since the last
    /// sync. A first sync (no `since`) pulls the whole list.
    func sync() async {
        guard !isSyncing, await OtterClient.shared.isSignedIn() else { return }
        isSyncing = true
        defer { isSyncing = false }

        await flush()

        do {
            let since = defaults.string(forKey: sinceKey)
            // Page through everything; the server caps a page at 200.
            var changes: [ReadingItem] = []
            var nextSince: String?
            var offset = 0
            while true {
                let page = try await OtterClient.shared.readingItems(since: since, offset: offset)
                changes += page.data
                nextSince = nextSince ?? page.nextSince
                if page.data.count < 200 { break }
                offset += page.data.count
            }
            merge(changes, replaceAll: since == nil)
            if let nextSince {
                defaults.set(nextSince, forKey: sinceKey)
            }
            lastError = nil
        } catch OtterError.notSignedIn {
            reset()
        } catch {
            lastError = error.localizedDescription
        }
    }

    private func merge(_ changes: [ReadingItem], replaceAll: Bool) {
        var byId = replaceAll ? [:] : Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0) })

        for change in changes {
            if change.isDeleted {
                byId[change.id] = nil
            } else {
                // Keep locally cached content; the list endpoint omits it.
                var merged = change
                merged.content = change.content ?? byId[change.id]?.content
                byId[change.id] = merged
            }
        }

        items = byId.values.sorted { $0.createdAt > $1.createdAt }
        cache.store((try? JSONEncoder().encode(items)) ?? Data())
    }

    private func upsert(_ item: ReadingItem) {
        var merged = item
        merged.content = item.content ?? self.item(id: item.id)?.content
        items.removeAll { $0.id == item.id }
        items.append(merged)
        items.sort { $0.createdAt > $1.createdAt }
        cache.store((try? JSONEncoder().encode(items)) ?? Data())
    }

    // MARK: - Actions

    @discardableResult
    func save(url: String) async throws -> ReadingItem {
        let item = try await OtterClient.shared.saveForLater(url: url)
        upsert(item)
        return item
    }

    /// Fetches the stored article and caches it for offline reading.
    func loadContent(for item: ReadingItem) async throws -> ReadingItem {
        if let cached = self.item(id: item.id), cached.content?.isEmpty == false {
            return cached
        }
        let full = try await OtterClient.shared.readingItem(id: item.id)
        upsert(full)
        return full
    }

    func reextract(_ item: ReadingItem) async throws {
        let full = try await OtterClient.shared.reextractReadingItem(id: item.id)
        upsert(full)
    }

    func setState(_ item: ReadingItem, state: String) {
        var updated = item
        updated.state = state
        upsert(updated)
        enqueue(PendingMutation(id: item.id, kind: .state, state: state))
    }

    func archive(_ item: ReadingItem) { setState(item, state: "archived") }
    func unarchive(_ item: ReadingItem) { setState(item, state: "ready") }

    func delete(_ item: ReadingItem) {
        items.removeAll { $0.id == item.id }
        cache.store((try? JSONEncoder().encode(items)) ?? Data())
        enqueue(PendingMutation(id: item.id, kind: .delete))
    }

    /// Debounced: reading scrolls constantly, the network shouldn't.
    func setProgress(_ item: ReadingItem, progress: Double) {
        guard progress > item.progress else { return }

        var updated = item
        updated.progress = progress
        upsert(updated)

        pending.removeAll { $0.id == item.id && $0.kind == .progress }
        pending.append(PendingMutation(id: item.id, kind: .progress, progress: progress))

        progressFlush?.cancel()
        progressFlush = Task {
            try? await Task.sleep(for: .seconds(2))
            guard !Task.isCancelled else { return }
            await flush()
        }
    }

    func toggleStar(_ item: ReadingItem) async {
        var updated = item
        updated.star.toggle()
        upsert(updated)
        do {
            _ = try await OtterClient.shared.setStar(id: item.bookmarkId, star: updated.star)
        } catch {
            upsert(item)
            lastError = error.localizedDescription
        }
    }

    private func enqueue(_ mutation: PendingMutation) {
        pending.append(mutation)
        Task { await flush() }
    }

    /// Replays the queue in order. Stops at the first network failure so order
    /// is preserved; drops a mutation the server has rejected outright.
    func flush() async {
        while let next = pending.first {
            do {
                switch next.kind {
                case .progress:
                    _ = try await OtterClient.shared.updateReadingItem(id: next.id, progress: next.progress)
                case .state:
                    _ = try await OtterClient.shared.updateReadingItem(id: next.id, state: next.state)
                case .delete:
                    try await OtterClient.shared.deleteReadingItem(id: next.id)
                }
                pending.removeFirst()
            } catch OtterError.server {
                // A 4xx won't get better by retrying — the item is gone or the
                // request is malformed.
                pending.removeFirst()
            } catch {
                return
            }
        }
    }

    func reset() {
        items = []
        pending = []
        cache.clear()
        defaults.removeObject(forKey: sinceKey)
    }
}
