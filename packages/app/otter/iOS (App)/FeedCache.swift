//
//  FeedCache.swift
//  iOS (App)
//
//  What a feed story pulls in once it is opened — its comment thread, its
//  extracted article — kept on disk so opening it again is instant. An actor,
//  so reading and decoding stay off the main thread. Entries over a week old
//  are swept at launch.
//

import CryptoKit
import Foundation

actor FeedCache {
    nonisolated static let shared = FeedCache()

    private nonisolated static let maxAge: TimeInterval = 7 * 24 * 60 * 60

    private let directory: URL?

    private init() {
        directory = FileManager.default
            .urls(for: .cachesDirectory, in: .userDomainMask)
            .first?
            .appendingPathComponent("feed-items", isDirectory: true)
        if let directory {
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }
    }

    /// The stored value and when it was written, or nil if there is none.
    func load<T: Decodable & Sendable>(_ type: T.Type, for key: String) -> (value: T, savedAt: Date)? {
        guard let file = file(for: key),
              let data = try? Data(contentsOf: file),
              let value = try? JSONDecoder().decode(type, from: data)
        else { return nil }
        let savedAt = (try? file.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
        return (value, savedAt ?? .distantPast)
    }

    func save<T: Encodable & Sendable>(_ value: T, for key: String) {
        guard let file = file(for: key), let data = try? JSONEncoder().encode(value) else { return }
        try? data.write(to: file, options: .atomic)
    }

    func sweep() {
        guard let directory,
              let files = try? FileManager.default.contentsOfDirectory(
                  at: directory,
                  includingPropertiesForKeys: [.contentModificationDateKey]
              )
        else { return }
        let cutoff = Date().addingTimeInterval(-Self.maxAge)
        for file in files {
            let modified = (try? file.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
            if (modified ?? .distantPast) < cutoff {
                try? FileManager.default.removeItem(at: file)
            }
        }
    }

    /// Keys are URLs and IDs; hashing makes them safe file names.
    private func file(for key: String) -> URL? {
        let name = SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
        return directory?.appendingPathComponent(name)
    }
}
