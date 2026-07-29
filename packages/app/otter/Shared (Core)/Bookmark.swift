//
//  Bookmark.swift
//  Shared (Core)
//

import Foundation

/// A row from `GET /api/bookmarks`. Only the fields the app renders are decoded.
nonisolated struct Bookmark: Identifiable, Hashable, Decodable {
    let id: String
    let url: String?
    let title: String?
    let description: String?
    let image: String?
    let note: String?
    let tags: [String]?
    let type: String?
    let star: Bool
    let status: String
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case url
        case title
        case description
        case image
        case note
        case tags
        case type
        case star
        case status
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        url = try container.decodeIfPresent(String.self, forKey: .url)
        title = try container.decodeIfPresent(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        image = try container.decodeIfPresent(String.self, forKey: .image)
        note = try container.decodeIfPresent(String.self, forKey: .note)
        tags = try container.decodeIfPresent([String].self, forKey: .tags)
        type = try container.decodeIfPresent(String.self, forKey: .type)
        star = try container.decodeIfPresent(Bool.self, forKey: .star) ?? false
        status = try container.decodeIfPresent(String.self, forKey: .status) ?? "active"
        createdAt = try container
            .decodeIfPresent(String.self, forKey: .createdAt)
            .flatMap(Bookmark.parseTimestamp)
    }

    var displayTitle: String {
        if let title, !title.isEmpty { return title }
        if let host { return host }
        return url ?? "Untitled"
    }

    var host: String? {
        guard let url, let components = URLComponents(string: url), let host = components.host else {
            return nil
        }
        return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    }

    var linkURL: URL? {
        guard let url else { return nil }
        return URL(string: url)
    }

    var imageURL: URL? {
        guard let image, !image.isEmpty else { return nil }
        return URL(string: image)
    }

    /// Otter serialises timestamps with fractional seconds, which
    /// `ISO8601DateFormatter` only handles when explicitly asked.
    private static func parseTimestamp(_ value: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let date = withFraction.date(from: value) { return date }

        return ISO8601DateFormatter().date(from: value)
    }
}

/// The envelope Otter's paginated endpoints return. `/api/collections/:name`
/// omits the paging echo, so those fields are optional.
nonisolated struct BookmarkPage: Decodable {
    let data: [Bookmark]
    let count: Int
    let limit: Int?
    let offset: Int?
}
