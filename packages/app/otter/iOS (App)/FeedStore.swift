//
//  FeedStore.swift
//  iOS (App)
//
//  Feed items, read and starred state, and subscriptions. All on this device.
//
//  ponytail: state lives in UserDefaults, not CloudKit. Add CloudKit when a
//  second device matters; the shape (sets of item IDs) maps straight onto it.
//

import Combine
import Foundation

@MainActor
final class FeedStore: ObservableObject {
    static let shared = FeedStore()

    static let builtIn: [any FeedSource] = [HackerNewsSource(), LobstersSource(), RSSSource.techmeme, RSSSource.pinboard]

    @Published private(set) var itemsBySource: [String: [FeedItem]] = [:]
    @Published private(set) var errorsBySource: [String: String] = [:]
    @Published private(set) var refreshing: Set<String> = []
    @Published private(set) var subscriptions: [FeedSubscription] = []
    /// Built-in sources switched off in Settings.
    @Published private(set) var disabledBuiltIn: Set<String> = []
    @Published private(set) var readIDs: Set<String> = []
    @Published private(set) var starredIDs: Set<String> = []
    /// Starred items outlive their feed, so they are kept whole.
    @Published private(set) var starred: [FeedItem] = []
    @Published private(set) var lastRefresh: Date?
    /// When each source last came back with items, so a screen can say so.
    @Published private(set) var lastRefreshBySource: [String: Date] = [:]

    private let cache = DiskCache(fileName: "feeds.json")
    private let defaults = UserDefaults.standard

    private struct Snapshot: Codable {
        var items: [String: [FeedItem]]
        var starred: [FeedItem]
        var lastRefresh: Date?
        /// Optional so snapshots written before this existed still decode.
        var lastRefreshBySource: [String: Date]?
    }

    private init() {
        subscriptions = defaults.data(forKey: "feeds.subscriptions")
            .flatMap { try? JSONDecoder().decode([FeedSubscription].self, from: $0) } ?? []
        disabledBuiltIn = Set(defaults.stringArray(forKey: "feeds.disabled") ?? [])
        readIDs = Set(defaults.stringArray(forKey: "feeds.read") ?? [])
        starredIDs = Set(defaults.stringArray(forKey: "feeds.starred") ?? [])
        if let snapshot = cache.load(Snapshot.self) {
            itemsBySource = snapshot.items
            starred = snapshot.starred
            lastRefresh = snapshot.lastRefresh
            lastRefreshBySource = snapshot.lastRefreshBySource ?? [:]
        }
    }

    var sources: [any FeedSource] {
        Self.builtIn.filter { !disabledBuiltIn.contains($0.id) } + subscriptions.map { RSSSource(id: $0.id, title: $0.title, url: URL(string: $0.url) ?? URL(string: "https://invalid")!) }
    }

    func items(for sourceID: String) -> [FeedItem] {
        itemsBySource[sourceID] ?? []
    }

    /// Folder names from the OPML import, sorted. Feeds without one are loose.
    var folders: [String] {
        Array(Set(subscriptions.compactMap(\.folder))).sorted { $0.localizedCaseInsensitiveCompare($1) == .orderedAscending }
    }

    func subscriptions(in folder: String?) -> [FeedSubscription] {
        subscriptions
            .filter { $0.folder == folder }
            .sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
    }

    /// Every subscribed feed, or one folder's, merged newest first.
    func mergedItems(folder: String? = nil, all: Bool = false) -> [FeedItem] {
        let ids = (all ? subscriptions : subscriptions(in: folder)).map(\.id)
        return ids.flatMap { items(for: $0) }
            .sorted { ($0.publishedAt ?? .distantPast) > ($1.publishedAt ?? .distantPast) }
    }

    func title(forSource id: String) -> String? {
        sources.first { $0.id == id }?.title
    }

    func isRead(_ item: FeedItem) -> Bool { readIDs.contains(item.id) }
    func isStarred(_ item: FeedItem) -> Bool { starredIDs.contains(item.id) }

    /// The oldest successful sync across these sources — the honest answer for
    /// a merged view. Sources that have never synced are skipped.
    func lastRefresh(forSources ids: [String]) -> Date? {
        ids.compactMap { lastRefreshBySource[$0] }.min()
    }

    var isStale: Bool {
        guard let lastRefresh else { return true }
        return Date().timeIntervalSince(lastRefresh) > 10 * 60
    }

    // MARK: - Refresh

    func refreshIfStale() async {
        if isStale { await refreshAll() }
    }

    func refreshAll() async {
        await withTaskGroup(of: Void.self) { group in
            for source in sources {
                group.addTask { await self.refresh(source) }
            }
        }
        lastRefresh = Date()
        persist()
    }

    func refresh(_ source: any FeedSource) async {
        refreshing.insert(source.id)
        defer { refreshing.remove(source.id) }

        do {
            let items = try await source.fetch()
            itemsBySource[source.id] = items
            errorsBySource[source.id] = nil
            lastRefreshBySource[source.id] = Date()
        } catch {
            errorsBySource[source.id] = error.localizedDescription
        }
        persist()
    }

    // MARK: - State

    func markRead(_ item: FeedItem, read: Bool = true) {
        if read { readIDs.insert(item.id) } else { readIDs.remove(item.id) }
        // Keep the set bounded; anything older than the newest 3000 is long gone from every feed.
        if readIDs.count > 3000 { readIDs = Set(readIDs.suffix(2000)) }
        defaults.set(Array(readIDs), forKey: "feeds.read")
    }

    func markAllRead(sourceID: String) {
        for item in items(for: sourceID) { readIDs.insert(item.id) }
        defaults.set(Array(readIDs), forKey: "feeds.read")
    }

    func toggleStar(_ item: FeedItem) {
        if starredIDs.contains(item.id) {
            starredIDs.remove(item.id)
            starred.removeAll { $0.id == item.id }
        } else {
            starredIDs.insert(item.id)
            starred.insert(item, at: 0)
        }
        defaults.set(Array(starredIDs), forKey: "feeds.starred")
        persist()
    }

    func isEnabled(_ source: any FeedSource) -> Bool {
        !disabledBuiltIn.contains(source.id)
    }

    func setEnabled(_ enabled: Bool, source: any FeedSource) {
        if enabled { disabledBuiltIn.remove(source.id) } else { disabledBuiltIn.insert(source.id) }
        defaults.set(Array(disabledBuiltIn), forKey: "feeds.disabled")
        if enabled, items(for: source.id).isEmpty {
            Task { await refresh(source) }
        }
    }

    // MARK: - Subscriptions

    /// Fetches the feed once to prove it parses and to pick up its title.
    @discardableResult
    func subscribe(url rawURL: String, title: String? = nil, folder: String? = nil) async throws -> FeedSubscription {
        var text = rawURL.trimmingCharacters(in: .whitespacesAndNewlines)
        if !text.contains("://") { text = "https://" + text }
        guard let url = URL(string: text), url.host != nil else { throw FeedError.unreadable("That isn't a URL.") }

        if let existing = subscriptions.first(where: { $0.url == url.absoluteString }) { return existing }

        let id = "rss:" + UUID().uuidString
        let parsed = try await RSSSource.load(url, sourceID: id)
        let subscription = FeedSubscription(id: id, url: url.absoluteString, title: title ?? parsed.title ?? url.host ?? text, folder: folder)
        subscriptions.append(subscription)
        itemsBySource[id] = parsed.items
        lastRefreshBySource[id] = Date()
        saveSubscriptions()
        persist()
        return subscription
    }

    func unsubscribe(_ subscription: FeedSubscription) {
        subscriptions.removeAll { $0.id == subscription.id }
        itemsBySource[subscription.id] = nil
        saveSubscriptions()
        persist()
    }

    /// Drops every subscribed feed. Built-in sources and starred items stay.
    func unsubscribeAll() {
        for subscription in subscriptions { itemsBySource[subscription.id] = nil }
        subscriptions = []
        saveSubscriptions()
        persist()
    }

    /// Imports every `<outline xmlUrl=…>`; feeds that fail to load are skipped
    /// and counted so the caller can say so.
    func importOPML(_ data: Data) async -> (added: Int, failed: Int) {
        let outlines = OPML.feeds(in: data)
        var added = 0, failed = 0
        for outline in outlines {
            do {
                let before = subscriptions.count
                try await subscribe(url: outline.url, title: outline.title, folder: outline.folder)
                if subscriptions.count > before { added += 1 }
            } catch {
                failed += 1
            }
        }
        return (added, failed)
    }

    func exportOPML() -> String {
        OPML.document(subscriptions)
    }

    private func saveSubscriptions() {
        defaults.set(try? JSONEncoder().encode(subscriptions), forKey: "feeds.subscriptions")
    }

    private func persist() {
        let snapshot = Snapshot(
            items: itemsBySource,
            starred: starred,
            lastRefresh: lastRefresh,
            lastRefreshBySource: lastRefreshBySource
        )
        cache.store((try? JSONEncoder().encode(snapshot)) ?? Data())
    }
}

nonisolated enum OPML {
    struct Outline {
        let url: String
        let title: String?
        let folder: String?
    }

    static func feeds(in data: Data) -> [Outline] {
        let collector = Collector()
        let parser = XMLParser(data: data)
        parser.delegate = collector
        parser.parse()
        return collector.outlines
    }

    static func document(_ subscriptions: [FeedSubscription]) -> String {
        let escape = { (s: String) in
            s.replacingOccurrences(of: "&", with: "&amp;")
                .replacingOccurrences(of: "<", with: "&lt;")
                .replacingOccurrences(of: "\"", with: "&quot;")
        }
        let feed = { (s: FeedSubscription, indent: String) in
            "\(indent)<outline type=\"rss\" text=\"\(escape(s.title))\" title=\"\(escape(s.title))\" xmlUrl=\"\(escape(s.url))\"/>"
        }
        var lines = subscriptions.filter { $0.folder == nil }.map { feed($0, "    ") }
        let folders = Array(Set(subscriptions.compactMap(\.folder))).sorted()
        for folder in folders {
            lines.append("    <outline text=\"\(escape(folder))\" title=\"\(escape(folder))\">")
            lines += subscriptions.filter { $0.folder == folder }.map { feed($0, "      ") }
            lines.append("    </outline>")
        }
        return """
        <?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <head><title>Otter Reader subscriptions</title></head>
          <body>
        \(lines.joined(separator: "\n"))
          </body>
        </opml>
        """
    }

    /// An `<outline>` without `xmlUrl` is a folder; the ones inside it carry
    /// its name. Feedly exports one level, but deeper nesting joins with " / ".
    nonisolated private final class Collector: NSObject, XMLParserDelegate {
        var outlines: [Outline] = []
        private var folders: [String] = []
        private var isFolder: [Bool] = []

        func parser(_ parser: XMLParser, didStartElement name: String, namespaceURI: String?, qualifiedName: String?, attributes: [String: String] = [:]) {
            guard name == "outline" else { return }
            let title = attributes["title"] ?? attributes["text"]

            if let url = attributes["xmlUrl"], !url.isEmpty {
                isFolder.append(false)
                outlines.append(Outline(url: url, title: title, folder: folders.isEmpty ? nil : folders.joined(separator: " / ")))
            } else {
                isFolder.append(true)
                folders.append(title ?? "Folder")
            }
        }

        func parser(_ parser: XMLParser, didEndElement name: String, namespaceURI: String?, qualifiedName: String?) {
            guard name == "outline", let folder = isFolder.popLast() else { return }
            if folder { folders.removeLast() }
        }
    }
}
