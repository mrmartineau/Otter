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

    static let builtIn: [any FeedSource] = [HackerNewsSource(), LobstersSource(), RSSSource.techmeme]

    @Published private(set) var itemsBySource: [String: [FeedItem]] = [:]
    @Published private(set) var errorsBySource: [String: String] = [:]
    @Published private(set) var refreshing: Set<String> = []
    @Published private(set) var subscriptions: [FeedSubscription] = []
    @Published private(set) var readIDs: Set<String> = []
    @Published private(set) var starredIDs: Set<String> = []
    /// Starred items outlive their feed, so they are kept whole.
    @Published private(set) var starred: [FeedItem] = []
    @Published private(set) var lastRefresh: Date?

    private let cache = DiskCache(fileName: "feeds.json")
    private let defaults = UserDefaults.standard

    private struct Snapshot: Codable {
        var items: [String: [FeedItem]]
        var starred: [FeedItem]
        var lastRefresh: Date?
    }

    private init() {
        subscriptions = defaults.data(forKey: "feeds.subscriptions")
            .flatMap { try? JSONDecoder().decode([FeedSubscription].self, from: $0) } ?? []
        readIDs = Set(defaults.stringArray(forKey: "feeds.read") ?? [])
        starredIDs = Set(defaults.stringArray(forKey: "feeds.starred") ?? [])
        if let snapshot = cache.load(Snapshot.self) {
            itemsBySource = snapshot.items
            starred = snapshot.starred
            lastRefresh = snapshot.lastRefresh
        }
    }

    var sources: [any FeedSource] {
        Self.builtIn + subscriptions.map { RSSSource(id: $0.id, title: $0.title, url: URL(string: $0.url) ?? URL(string: "https://invalid")!) }
    }

    func items(for sourceID: String) -> [FeedItem] {
        itemsBySource[sourceID] ?? []
    }

    func isRead(_ item: FeedItem) -> Bool { readIDs.contains(item.id) }
    func isStarred(_ item: FeedItem) -> Bool { starredIDs.contains(item.id) }

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

    // MARK: - Subscriptions

    /// Fetches the feed once to prove it parses and to pick up its title.
    @discardableResult
    func subscribe(url rawURL: String, title: String? = nil) async throws -> FeedSubscription {
        var text = rawURL.trimmingCharacters(in: .whitespacesAndNewlines)
        if !text.contains("://") { text = "https://" + text }
        guard let url = URL(string: text), url.host != nil else { throw FeedError.unreadable("That isn't a URL.") }

        if let existing = subscriptions.first(where: { $0.url == url.absoluteString }) { return existing }

        let id = "rss:" + UUID().uuidString
        let parsed = try await RSSSource.load(url, sourceID: id)
        let subscription = FeedSubscription(id: id, url: url.absoluteString, title: title ?? parsed.title ?? url.host ?? text)
        subscriptions.append(subscription)
        itemsBySource[id] = parsed.items
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

    /// Imports every `<outline xmlUrl=…>`; feeds that fail to load are skipped
    /// and counted so the caller can say so.
    func importOPML(_ data: Data) async -> (added: Int, failed: Int) {
        let outlines = OPML.feeds(in: data)
        var added = 0, failed = 0
        for outline in outlines {
            do {
                let before = subscriptions.count
                try await subscribe(url: outline.url, title: outline.title)
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
        let snapshot = Snapshot(items: itemsBySource, starred: starred, lastRefresh: lastRefresh)
        cache.store((try? JSONEncoder().encode(snapshot)) ?? Data())
    }
}

nonisolated enum OPML {
    struct Outline {
        let url: String
        let title: String?
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
        let outlines = subscriptions.map {
            "    <outline type=\"rss\" text=\"\(escape($0.title))\" title=\"\(escape($0.title))\" xmlUrl=\"\(escape($0.url))\"/>"
        }
        return """
        <?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <head><title>Otter Reader subscriptions</title></head>
          <body>
        \(outlines.joined(separator: "\n"))
          </body>
        </opml>
        """
    }

    nonisolated private final class Collector: NSObject, XMLParserDelegate {
        var outlines: [Outline] = []

        func parser(_ parser: XMLParser, didStartElement name: String, namespaceURI: String?, qualifiedName: String?, attributes: [String: String] = [:]) {
            guard name == "outline", let url = attributes["xmlUrl"], !url.isEmpty else { return }
            outlines.append(Outline(url: url, title: attributes["title"] ?? attributes["text"]))
        }
    }
}
