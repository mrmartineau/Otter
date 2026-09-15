//
//  OtterClient+Reader.swift
//  Shared (Core)
//
//  The read-it-later endpoints under `/api/reader`.
//

import Foundation

extension OtterClient {
    private struct ItemWrapper: Decodable {
        let data: ReadingItem
    }

    /// `POST /api/reader/items` — creates the article bookmark and runs
    /// extraction. Idempotent: re-saving a URL returns the existing item.
    func saveForLater(url: String) async throws -> ReadingItem {
        let data = try await perform(
            path: "api/reader/items",
            method: "POST",
            body: try JSONEncoder().encode(["url": url])
        )
        return try decodeItem(data)
    }

    /// `GET /api/reader/items`. With `since`, returns every change after that
    /// instant, tombstones included.
    func readingItems(state: String = "all", since: String? = nil, limit: Int = 200, offset: Int = 0) async throws -> ReadingPage {
        var query = [
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "offset", value: String(offset)),
        ]
        if let since { query.append(URLQueryItem(name: "since", value: since)) }

        let data = try await perform(path: "api/reader/items", query: query)

        guard let page = try? JSONDecoder().decode(ReadingPage.self, from: data) else {
            throw Self.readerError(data)
        }
        return page
    }

    /// `GET /api/reader/items/:id` — includes the stored markdown.
    func readingItem(id: String) async throws -> ReadingItem {
        try decodeItem(try await perform(path: "api/reader/items/\(id)"))
    }

    /// `PATCH /api/reader/items/:id`. Only the keys sent are written; the
    /// server never lets progress move backwards.
    func updateReadingItem(id: String, state: String? = nil, progress: Double? = nil) async throws -> ReadingItem {
        var body: [String: AnyEncodable] = [:]
        if let state { body["state"] = AnyEncodable(state) }
        if let progress { body["progress"] = AnyEncodable(progress) }

        let data = try await perform(
            path: "api/reader/items/\(id)",
            method: "PATCH",
            body: try JSONEncoder().encode(body)
        )
        return try decodeItem(data)
    }

    /// `DELETE /api/reader/items/:id` — removes it from the reading list. The
    /// bookmark stays in Otter.
    func deleteReadingItem(id: String) async throws {
        _ = try await perform(path: "api/reader/items/\(id)", method: "DELETE")
    }

    /// `POST /api/reader/items/:id/reextract`
    func reextractReadingItem(id: String) async throws -> ReadingItem {
        try decodeItem(try await perform(path: "api/reader/items/\(id)/reextract", method: "POST"))
    }

    private func decodeItem(_ data: Data) throws -> ReadingItem {
        guard let wrapper = try? JSONDecoder().decode(ItemWrapper.self, from: data) else {
            throw Self.readerError(data)
        }
        return wrapper.data
    }

    /// An instance without the reader routes answers `/api/reader/*` with the
    /// web app's HTML (the SPA fallback): a 200 that isn't JSON.
    private static func readerError(_ data: Data) -> OtterError {
        if data.first == UInt8(ascii: "<") {
            return .server("This Otter instance doesn't have the reader API yet. Deploy the latest Otter.")
        }
        return .invalidResponse
    }
}

/// Lets one JSON body carry a string and a number without a bespoke struct.
nonisolated struct AnyEncodable: Encodable {
    private let encode: (Encoder) throws -> Void

    init<T: Encodable>(_ value: T) {
        encode = { try value.encode(to: $0) }
    }

    func encode(to encoder: Encoder) throws {
        try encode(encoder)
    }
}
