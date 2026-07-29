//
//  DiskCache.swift
//  Shared (Core)
//
//  Raw API responses kept on disk so screens render instantly at launch and the
//  network refresh happens behind whatever is already on screen. Response
//  bodies are stored verbatim, so decoding stays in one place.
//

import Foundation

nonisolated struct DiskCache {
    let fileName: String

    private var fileURL: URL? {
        FileManager.default
            .urls(for: .cachesDirectory, in: .userDomainMask)
            .first?
            .appendingPathComponent(fileName)
    }

    func store(_ data: Data) {
        guard let fileURL else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    func load<T: Decodable>(_ type: T.Type) -> T? {
        guard let fileURL, let data = try? Data(contentsOf: fileURL) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    /// When the cached copy was last written — used to decide staleness.
    var updatedAt: Date? {
        guard let fileURL else { return nil }
        let attributes = try? FileManager.default.attributesOfItem(atPath: fileURL.path)
        return attributes?[.modificationDate] as? Date
    }

    func clear() {
        guard let fileURL else { return }
        try? FileManager.default.removeItem(at: fileURL)
    }
}

/// The first page of the unfiltered bookmark feed.
nonisolated enum BookmarkCache {
    private static let cache = DiskCache(fileName: "otter-bookmarks-first-page.json")

    static func store(_ data: Data) {
        cache.store(data)
    }

    static func load() -> BookmarkPage? {
        cache.load(BookmarkPage.self)
    }

    static var updatedAt: Date? {
        cache.updatedAt
    }

    static func clear() {
        cache.clear()
    }
}

/// Tags, types and collections — everything `GET /api/meta` returns.
nonisolated enum MetadataCache {
    private static let cache = DiskCache(fileName: "otter-meta.json")

    static func store(_ data: Data) {
        cache.store(data)
    }

    static func load() -> OtterMeta? {
        cache.load(OtterMeta.self)
    }

    static var updatedAt: Date? {
        cache.updatedAt
    }

    static func clear() {
        cache.clear()
    }
}
